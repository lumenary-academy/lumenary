#!/usr/bin/env python3
"""Run the code in the course lessons (Lumenary CS, EE, Robotics) and write the course code report.

For every lesson of every course (content/<course>/lessons/<slug>: Lumenary CS, its programming
languages and electives, Lumenary EE and Lumenary Robotics; see docs/courses.md):

* every fenced ```python run block in lesson.mdx runs in a fresh interpreter
  (``python -I -X utf8``), the way the browser runs it: top-level ``await`` is
  allowed, and it must finish without an exception inside the timeout;
* every Python exercise in exercises.json runs twice: its ``reference`` followed
  by its ``tests`` must pass, and its ``starter`` followed by its ``tests`` must
  fail (tests that the starter already passes check nothing);
* every fenced ```<lang> check block (the programming-language courses) is a
  complete program, compiled and run with that language's own toolchain (see
  RUNNERS below and compute/toolchains/setup.sh); it must exit with status 0.
  A check whose toolchain is not installed is counted as skipped, never passed.

Writes ``content/verification/course-code-report.json`` (the ``CourseCodeReport``
zod schema in src/lib/schema.ts). A lesson shows "Code tested" only when every
snippet and exercise in it passed. Exits non-zero if anything failed.

Usage:  compute/.venv/bin/python compute/verify_courses.py [--only cs/complexity] [--timeout 60]
(or ``npm run verify:courses``). ``--only`` takes a lesson ("cs/complexity"), a
course ("cs", "cs/languages/rust") or several, and updates just those rows.
"""

import argparse
import concurrent.futures
import datetime
import json
import os
import pathlib
import platform
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
REPORT = CONTENT / "verification" / "course-code-report.json"
SEPARATOR = "\n#@@ lumenary: tests follow @@\n"
FINISHED = "#@@ lumenary: finished @@"

# Runs each part in one namespace, as the browser's worker does (runPythonAsync). A program that is
# still running shortly before the timeout prints every thread's Python stack and exits, so a hang
# is reported with where it happened; one that finishes says so on stderr, so a process that hangs
# only while exiting (in a library's threads, after the code is done) can be told apart.
RUNNER = r'''
import ast, asyncio, faulthandler, os, sys
faulthandler.dump_traceback_later(float(os.environ["LUMENARY_STACKS_AFTER"]), exit=True)
source = sys.stdin.read()
ns = {"__name__": "__main__"}
for part in source.split(SEPARATOR):
    code = compile(part, "<lesson>", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    result = eval(code, ns)
    if asyncio.iscoroutine(result):
        asyncio.run(result)
faulthandler.cancel_dump_traceback_later()
sys.stdout.flush()
print(FINISHED, file=sys.stderr, flush=True)
'''.replace("SEPARATOR", repr(SEPARATOR)).replace("FINISHED", repr(FINISHED))

RUN_BLOCK = re.compile(r"^```python[ \t]+run[ \t]*\n(.*?)^```\s*$", re.M | re.S)
CHECK_BLOCK = re.compile(r"^```([\w#+-]+)[ \t]+check[ \t]*\n(.*?)^```\s*$", re.M | re.S)

# Lessons run in parallel (--jobs, one per CPU by default); without a cap, each NumPy/SciPy process
# would also start one BLAS thread per CPU, and on a busy machine blocks that take a second alone
# time out. The learner's browser runs them single-threaded too.
SINGLE_THREADED = {k: "1" for k in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS")}
TOOLCHAINS = pathlib.Path(os.environ.get("LUMENARY_TOOLCHAINS", pathlib.Path.home() / ".cache" / "lumenary-toolchains"))
T = str(TOOLCHAINS)
TSC = ROOT / "node_modules" / "typescript" / "bin" / "tsc"

# How each language's check blocks run: the file the block is saved as, a shell command run in a
# temporary directory holding it, and either a local executable it needs or a Docker image (run
# with no network). Fence names are the ones lessons use (```rust check, ```cpp check, ...).
RUNNERS = {
    "asm": {"file": "main.s", "cmd": "as --64 -o main.o main.s && ld -o main main.o && ./main", "needs": "as", "version": "as --version"},
    "bash": {"file": "main.sh", "cmd": "bash main.sh", "needs": "bash", "version": "bash --version"},
    "c": {"file": "main.c", "cmd": "gcc -std=c17 -Wall -Wextra -O1 main.c -o main -lm && ./main", "needs": "gcc", "version": "gcc --version"},
    "cpp": {"file": "main.cpp", "cmd": "g++ -std=c++23 -Wall -Wextra -O1 main.cpp -o main && ./main", "image": "gcc:14", "version": "g++ --version"},
    "fortran": {"file": "main.f90", "cmd": "gfortran -std=f2018 -Wall main.f90 -o main && ./main", "needs": "gfortran", "version": "gfortran --version"},
    "rust": {"file": "main.rs", "cmd": "rustc --edition 2024 -O main.rs -o main && ./main", "needs": "rustc", "version": "rustc --version"},
    "zig": {"file": "main.zig", "cmd": f"ZIG_GLOBAL_CACHE_DIR={T}/zig-cache zig run main.zig", "needs": "zig", "version": "zig version"},
    "go": {"file": "main.go", "cmd": f"GOTOOLCHAIN=local GOCACHE={T}/go-cache GOPATH={T}/go-path go run main.go", "needs": "go", "version": "go version"},
    "java": {"file": "Main.java", "cmd": f"{T}/jdk25/bin/java Main.java", "needs": f"{T}/jdk25/bin/java", "version": f"{T}/jdk25/bin/java --version"},
    "kotlin": {"file": "main.kt", "cmd": f"JAVA_HOME={T}/jdk21 PATH={T}/jdk21/bin:$PATH {T}/kotlinc/bin/kotlinc -nowarn main.kt -include-runtime -d main.jar 2>/dev/null && {T}/jdk21/bin/java -jar main.jar", "needs": f"{T}/kotlinc/bin/kotlinc", "version": f"JAVA_HOME={T}/jdk21 {T}/kotlinc/bin/kotlinc -version"},
    "scala": {"file": "main.scala", "cmd": f"JAVA_HOME={T}/jdk21 PATH={T}/jdk21/bin:$PATH scala-cli run --server=false -q main.scala", "needs": "scala-cli", "version": f"JAVA_HOME={T}/jdk21 scala-cli version"},
    "csharp": {"file": "main.cs", "cmd": f"DOTNET_CLI_HOME={T}/dotnet-home DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet run main.cs", "needs": "dotnet", "version": "dotnet --version"},
    "fsharp": {"file": "main.fsx", "cmd": f"DOTNET_CLI_HOME={T}/dotnet-home DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet fsi --quiet main.fsx", "needs": "dotnet", "version": "dotnet --version"},
    "vb": {"file": "Program.vb", "cmd": f"export DOTNET_CLI_HOME={T}/dotnet-home DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1; dotnet new console -lang VB -o app --force >/dev/null && cp Program.vb app/Program.vb && dotnet run --project app", "needs": "dotnet", "version": "dotnet --version"},
    "dart": {"file": "main.dart", "cmd": f"PUB_CACHE={T}/pub-cache dart run main.dart", "needs": "dart", "version": "dart --version"},
    "javascript": {"file": "main.mjs", "cmd": "node main.mjs", "needs": "node", "version": "node --version"},
    "typescript": {"file": "main.ts", "cmd": f"node {TSC} --strict --target es2023 --module nodenext --moduleResolution nodenext --skipLibCheck --typeRoots {ROOT}/node_modules/@types --types node main.ts && node main.js", "needs": "node", "version": f"node {TSC} --version"},
    "python": {"file": "main.py", "cmd": f"{T}/bin/python3.13 -I main.py", "needs": f"{T}/bin/python3.13", "version": f"{T}/bin/python3.13 --version"},
    "perl": {"file": "main.pl", "cmd": "perl main.pl", "needs": "perl", "version": "perl -e 'print $^V'"},
    "lua": {"file": "main.lua", "cmd": "lua main.lua", "needs": "lua", "version": "lua -v"},
    "r": {"file": "main.R", "cmd": "Rscript --vanilla main.R", "needs": "Rscript", "version": "Rscript --version"},
    "julia": {"file": "main.jl", "cmd": f"JULIA_DEPOT_PATH={T}/julia-depot julia --startup-file=no main.jl", "needs": "julia", "version": "julia --version"},
    # Core Lean (no Mathlib), the version Lumenary Math pins in formal/lean-toolchain: run `main` when
    # there is one, otherwise just check the file; a `sorry` fails the check.
    "lean": {"file": "main.lean", "cmd": f"if grep -q '^def main' main.lean; then out=$({T}/lean/bin/lean --run main.lean 2>&1); else out=$({T}/lean/bin/lean main.lean 2>&1); fi; s=$?; printf '%s\\n' \"$out\"; [ $s -eq 0 ] && ! printf '%s' \"$out\" | grep -q 'declaration uses .sorry'", "needs": f"{T}/lean/bin/lean", "version": f"{T}/lean/bin/lean --version"},
    "sql": {"file": "main.sql", "cmd": "sqlite3 -bail :memory: < main.sql", "needs": "sqlite3", "version": "sqlite3 --version"},
    "scheme": {"file": "main.scm", "cmd": f"LD_LIBRARY_PATH={T}/chibi/lib CHIBI_MODULE_PATH={T}/chibi/share/chibi:{T}/chibi/lib/chibi {T}/chibi/bin/chibi-scheme main.scm", "needs": f"{T}/chibi/bin/chibi-scheme", "version": f"LD_LIBRARY_PATH={T}/chibi/lib {T}/chibi/bin/chibi-scheme -V"},
    "cobol": {"file": "main.cob", "cmd": f"LD_LIBRARY_PATH={T}/cobol/lib {T}/cobol/bin/cobc -x -free main.cob -o main && LD_LIBRARY_PATH={T}/cobol/lib ./main", "needs": f"{T}/cobol/bin/cobc", "version": f"LD_LIBRARY_PATH={T}/cobol/lib {T}/cobol/bin/cobc --version"},
    "swift": {"file": "main.swift", "cmd": "swiftc main.swift -o main && ./main", "image": "swift:latest", "version": "swift --version"},
    "php": {"file": "main.php", "cmd": "php main.php", "image": "php:cli", "version": "php --version"},
    "ruby": {"file": "main.rb", "cmd": "ruby main.rb", "image": "ruby:latest", "version": "ruby --version"},
    "haskell": {"file": "main.hs", "cmd": "runghc main.hs", "image": "haskell:latest", "version": "ghc --version"},
    "ocaml": {"file": "main.ml", "cmd": "opam exec -- ocaml main.ml", "image": "ocaml/opam:debian-ocaml-5.4", "version": "opam exec -- ocaml -version"},
    "elixir": {"file": "main.exs", "cmd": "elixir main.exs", "image": "elixir:latest", "version": "elixir --version | tail -1"},
    "erlang": {"file": "main.erl", "cmd": "escript main.erl", "image": "elixir:latest", "version": "erl -noshell -eval 'io:fwrite(\"~s\", [erlang:system_info(otp_release)]), halt().'"},
    "clojure": {"file": "main.clj", "cmd": "clojure -M main.clj", "image": "clojure:temurin-21-tools-deps", "version": "clojure --version"},
    "prolog": {"file": "main.pl", "cmd": "swipl main.pl", "image": "swipl:latest", "version": "swipl --version"},
    "matlab": {"file": "main.m", "cmd": "octave --no-gui --no-window-system --quiet main.m", "image": "gnuoctave/octave:latest", "version": "octave --version | head -1"},
    "pascal": {"file": "main.pas", "cmd": "fpc -v0 main.pas >/dev/null && ./main", "image": "lumenary/debian-toolchains", "version": "fpc -iV"},
    "ada": {"file": "main.adb", "cmd": "gnatmake -q main.adb && ./main", "image": "lumenary/debian-toolchains", "version": "gnatmake --version | head -1"},
    # Lumenary EE: a Verilog design with its testbench in one file (the testbench calls $finish, and
    # $fatal on a failed self-check, which makes vvp exit non-zero), and a SPICE netlist run in batch mode.
    "verilog": {"file": "main.v", "cmd": "iverilog -g2012 -o main main.v && vvp -n main", "image": "lumenary/eda-toolchains", "version": "iverilog -V 2>&1 | head -1"},
    "spice": {"file": "main.cir", "cmd": "ngspice -b main.cir > out.log 2>&1; s=$?; cat out.log; [ $s -eq 0 ] && ! grep -qiE '^[[:space:]]*error|is not a valid|aborted' out.log", "image": "lumenary/eda-toolchains", "version": "ngspice -v 2>&1 | grep -m1 ngspice"},
}
ALIASES = {"lean4": "lean", "c++": "cpp", "cs": "csharp", "c#": "csharp", "f#": "fsharp", "visual-basic": "vb", "js": "javascript", "ts": "typescript", "sh": "bash", "octave": "matlab", "object-pascal": "pascal", "py": "python", "fortran-free-form": "fortran", "systemverilog": "verilog", "sv": "verilog", "ngspice": "spice"}


def runner_for(lang):
    """(runner, None) when the language's toolchain is available here, (None, reason) otherwise."""
    lang = ALIASES.get(lang, lang)
    r = RUNNERS.get(lang)
    if not r:
        return None, f"no runner for ```{lang} check"
    if "image" in r:
        if shutil.which("docker") is None:
            return None, "docker is not installed"
        ok = subprocess.run(["docker", "image", "inspect", r["image"]], capture_output=True).returncode == 0
        return (r, None) if ok else (None, f"docker image {r['image']} is not pulled")
    need = r["needs"]
    found = os.path.exists(need) if need.startswith("/") else shutil.which(need, path=f"{TOOLCHAINS / 'bin'}:{os.environ.get('PATH', '')}")
    return (r, None) if found else (None, f"{need} is not installed")


def shell(r, script, cwd, timeout):
    """Run a shell command for a runner, locally or in its Docker image, in directory cwd."""
    env = {**os.environ, "PATH": f"{TOOLCHAINS / 'bin'}:{os.environ.get('PATH', '')}", "HOME": os.environ.get("HOME", "/tmp")}
    if "image" in r:
        uid, gid = os.getuid(), os.getgid()
        wrapped = f"{script}; s=$?; chown -R {uid}:{gid} /w 2>/dev/null; exit $s"
        argv = ["docker", "run", "--rm", "--network", "none", "-v", f"{cwd}:/w", "-w", "/w", r["image"], "sh", "-c", wrapped]
    else:
        argv = ["bash", "-c", script]
    return subprocess.run(argv, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout)


VERSIONS = {}


def toolchain_version(lang, r):
    if lang not in VERSIONS:
        with tempfile.TemporaryDirectory() as tmp:
            try:
                out = shell(r, r["version"], tmp, 120)
                VERSIONS[lang] = (out.stdout or out.stderr).strip().splitlines()[0][:120] if (out.stdout or out.stderr).strip() else "unknown"
            except Exception:  # noqa: BLE001 - a version string is informational only
                VERSIONS[lang] = "unknown"
    return VERSIONS[lang]


PYTHON_ONLY = False


def run_check(lang, code, timeout):
    """("passed" | "failed" | "skipped", message) for one ```<lang> check block."""
    if PYTHON_ONLY:
        return "skipped", "--python-only"
    r, why = runner_for(lang)
    if r is None:
        return "skipped", why
    toolchain_version(ALIASES.get(lang, lang), r)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        pathlib.Path(tmp, r["file"]).write_text(code, encoding="utf-8")
        try:
            proc = shell(r, r["cmd"], tmp, timeout)
        except subprocess.TimeoutExpired:
            return "failed", f"timed out after {timeout}s"
    if proc.returncode != 0:
        tail = (proc.stderr.strip() or proc.stdout.strip()).splitlines()[-6:]
        return "failed", " | ".join(tail) or f"exit status {proc.returncode}"
    return "passed", ""


def lesson_dirs():
    """(key, path) for every lesson in a syllabus, key like "cs/complexity" or "cs/languages/rust/control-flow-and-patterns"."""
    for course, key, path in course_lessons():
        yield key, path


# Directories under content/ that are not courses, and the families of courses nested in a subject
# (mirrors courseDirs() in src/lib/courses.ts).
NOT_COURSES = {"math", "pages", "registry", "verification"}
COLLECTIONS = ("cs/languages", "cs/electives")


def course_dirs():
    """Every course directory under content/: subjects ("cs", "ee", "robotics") and the courses nested
    in a subject ("cs/languages/rust", "cs/electives/<id>")."""
    courses = [d.name for d in sorted(CONTENT.iterdir()) if d.name not in NOT_COURSES and (d / "course.json").exists()]
    for family in COLLECTIONS:
        base = CONTENT / family
        if base.exists():
            courses += [f"{family}/{d.name}" for d in sorted(base.iterdir()) if (d / "course.json").exists()]
    return courses


def course_lessons():
    """(course, key, path) for every lesson in a syllabus; course like "cs", "ee" or "cs/languages/rust"."""
    courses = course_dirs()
    for course in courses:
        syllabus = json.loads((CONTENT / course / "course.json").read_text(encoding="utf-8"))
        for level in syllabus["levels"]:
            for slug in level["lessons"]:
                yield course, f"{course}/{slug}", CONTENT / course / "lessons" / slug


def run(source, timeout):
    """(ok, message) for one program."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-X", "utf8", "-c", RUNNER],
                input=source, text=True, capture_output=True, timeout=timeout, cwd=tmp,
                env={**os.environ, "PYTHONHASHSEED": "0", "MPLBACKEND": "Agg", **SINGLE_THREADED,
                     "LUMENARY_STACKS_AFTER": str(max(timeout - 5, timeout * 0.9))},
            )
        except subprocess.TimeoutExpired as e:
            err = e.stderr.decode(errors="replace") if isinstance(e.stderr, bytes) else (e.stderr or "")
            if FINISHED in err:
                return False, f"timed out after {timeout}s: the code finished, but the process hung while exiting"
            return False, f"timed out after {timeout}s"
    if proc.returncode != 0:
        err = proc.stderr.strip()
        if err.startswith("Timeout (") or "\nTimeout (" in err:
            stacks = err[err.index("Timeout ("):].splitlines()
            return False, f"timed out after {timeout}s; Python stacks when it was stopped:\n" + "\n".join("      " + l for l in stacks[:60])
        return False, (err.splitlines() or ["exit status %d" % proc.returncode])[-1]
    return True, ""


def check_lesson(key, path, timeout, check_timeout=180):
    """The report row for one lesson, and a list of failure messages."""
    failures = []
    if not (path / "lesson.mdx").exists():
        return {"snippets": 0, "snippetsPassed": 0, "exercises": 0, "exercisesPassed": 0, "checks": 0, "checksPassed": 0, "checksSkipped": 0}, [f"{key}: lesson.mdx is missing"]
    body = (path / "lesson.mdx").read_text(encoding="utf-8")
    snippets = RUN_BLOCK.findall(body)
    snippets_passed = 0
    for i, code in enumerate(snippets, 1):
        ok, msg = run(code, timeout)
        snippets_passed += ok
        if not ok:
            failures.append(f"{key}: runnable block {i}: {msg}")
    exercises = []
    ex_file = path / "exercises.json"
    if ex_file.exists():
        exercises = [e for e in json.loads(ex_file.read_text(encoding="utf-8"))["exercises"] if e.get("type") == "python"]
    exercises_passed = 0
    for ex in exercises:
        ref = ex.get("reference")
        if not ref:
            failures.append(f"{key}: exercise {ex['id']}: no reference solution")
            continue
        ok, msg = run(ref + SEPARATOR + ex["tests"], timeout)
        if not ok:
            failures.append(f"{key}: exercise {ex['id']}: the reference fails its tests: {msg}")
            continue
        starter_ok, _ = run(ex["starter"] + SEPARATOR + ex["tests"], timeout)
        if starter_ok:
            failures.append(f"{key}: exercise {ex['id']}: the starter already passes the tests")
            continue
        exercises_passed += 1
    checks = CHECK_BLOCK.findall(body)
    checks_passed = checks_skipped = 0
    for i, (lang, code) in enumerate(checks, 1):
        outcome, msg = run_check(lang, code, check_timeout)
        if outcome == "passed":
            checks_passed += 1
        elif outcome == "skipped":
            checks_skipped += 1
            SKIPS.add(msg)
        else:
            failures.append(f"{key}: ```{lang} check block {i}: {msg}")
    row = {
        "snippets": len(snippets), "snippetsPassed": snippets_passed, "exercises": len(exercises), "exercisesPassed": exercises_passed,
        "checks": len(checks), "checksPassed": checks_passed, "checksSkipped": checks_skipped,
    }
    return row, failures


SKIPS = set()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--only", nargs="*", default=None, help="lessons or courses to check, e.g. cs/complexity or cs/languages/rust")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 2)
    parser.add_argument("--no-write", action="store_true", help="check only; leave the report as it is")
    parser.add_argument("--python-only", action="store_true", help="run the Python blocks and exercises; count every ```<lang> check as skipped (CI, whose toolchain versions differ from the reference ones)")
    parser.add_argument("--snippet", nargs=2, metavar=("LANG", "FILE"), help="compile and run one program with a check runner, print its output, and exit")
    args = parser.parse_args()

    global PYTHON_ONLY
    PYTHON_ONLY = args.python_only

    if args.snippet:
        lang, file = args.snippet
        r, why = runner_for(lang)
        if r is None:
            print(f"skipped: {why}", file=sys.stderr)
            return 2
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
            pathlib.Path(tmp, r["file"]).write_text(pathlib.Path(file).read_text(encoding="utf-8"), encoding="utf-8")
            proc = shell(r, r["cmd"], tmp, args.timeout * 3)
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        return proc.returncode

    # --only takes whole courses ("cs", "cs/languages/rust") or single lessons ("cs/complexity").
    selected = [
        (key, path) for course, key, path in course_lessons()
        if not args.only or any(o.rstrip("/") in (course, key) for o in args.only)
    ]
    rows, failures = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(check_lesson, key, path, args.timeout): key for key, path in selected}
        for fut in concurrent.futures.as_completed(futures):
            row, fails = fut.result()
            rows[futures[fut]] = row
            failures += fails

    snippets = sum(r["snippets"] for r in rows.values())
    exercises = sum(r["exercises"] for r in rows.values())
    checks = sum(r["checks"] for r in rows.values())
    skipped = sum(r["checksSkipped"] for r in rows.values())
    print(f"verify_courses: {len(rows)} lessons, {snippets} runnable blocks, {exercises} Python exercises, {checks} checks ({skipped} skipped); {len(failures)} failure(s)")
    for why in sorted(SKIPS):
        print(f"  skipped: {why}")
    for f in sorted(failures):
        print("  FAIL " + f, file=sys.stderr)
    if args.no_write:
        return 1 if failures else 0

    previous = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() and args.only else {"lessons": {}}
    known = {key for key, _ in lesson_dirs()}
    lessons = {k: v for k, v in previous.get("lessons", {}).items() if k in known}
    lessons.update(rows)
    report = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "python": platform.python_version(),
        "toolchains": {**{k: v for k, v in previous.get("toolchains", {}).items()}, **VERSIONS},
        "lessons": {k: lessons[k] for k in sorted(lessons)},
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
