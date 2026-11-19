#!/usr/bin/env python3
"""Run the code in Lumenary CS and Lumenary Lingua lessons and write the course code report.

For every lesson (content/cs/lessons/<slug>, content/lingua/<course>/lessons/<slug>):

* every fenced ```python run block in lesson.mdx runs in a fresh interpreter
  (``python -I -X utf8``), the way the browser runs it: top-level ``await`` is
  allowed, and it must finish without an exception inside the timeout;
* every Python exercise in exercises.json runs twice: its ``reference`` followed
  by its ``tests`` must pass, and its ``starter`` followed by its ``tests`` must
  fail (tests that the starter already passes check nothing).

Writes ``content/verification/course-code-report.json`` (the ``CourseCodeReport``
zod schema in src/lib/schema.ts). A lesson shows "Code tested" only when every
snippet and exercise in it passed. Exits non-zero if anything failed.

Usage:  compute/.venv/bin/python compute/verify_courses.py [--only cs/complexity] [--timeout 60]
(or ``npm run verify:courses``). ``--only`` takes a lesson ("cs/complexity"), a
course ("cs", "lingua/spanish") or several, and updates just those rows.
"""

import argparse
import concurrent.futures
import datetime
import json
import os
import pathlib
import platform
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
REPORT = CONTENT / "verification" / "course-code-report.json"
SEPARATOR = "\n#@@ lumenary: tests follow @@\n"

# Runs each part in one namespace, as the browser's worker does (runPythonAsync).
RUNNER = r'''
import ast, asyncio, sys
source = sys.stdin.read()
ns = {"__name__": "__main__"}
for part in source.split(SEPARATOR):
    code = compile(part, "<lesson>", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    result = eval(code, ns)
    if asyncio.iscoroutine(result):
        asyncio.run(result)
'''.replace("SEPARATOR", repr(SEPARATOR))

RUN_BLOCK = re.compile(r"^```python[ \t]+run[ \t]*\n(.*?)^```\s*$", re.M | re.S)


def lesson_dirs():
    """(key, path) for every lesson directory, key like "cs/complexity" or "lingua/spanish/a1-greetings"."""
    courses = []
    if (CONTENT / "cs" / "course.json").exists():
        courses.append("cs")
    lingua = CONTENT / "lingua"
    if lingua.exists():
        courses += [f"lingua/{d.name}" for d in sorted(lingua.iterdir()) if (d / "course.json").exists()]
    for course in courses:
        syllabus = json.loads((CONTENT / course / "course.json").read_text(encoding="utf-8"))
        for level in syllabus["levels"]:
            for slug in level["lessons"]:
                yield f"{course}/{slug}", CONTENT / course / "lessons" / slug


def run(source, timeout):
    """(ok, message) for one program."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-X", "utf8", "-c", RUNNER],
                input=source, text=True, capture_output=True, timeout=timeout, cwd=tmp,
                env={**os.environ, "PYTHONHASHSEED": "0", "MPLBACKEND": "Agg"},
            )
        except subprocess.TimeoutExpired:
            return False, f"timed out after {timeout}s"
    if proc.returncode != 0:
        return False, (proc.stderr.strip().splitlines() or ["exit status %d" % proc.returncode])[-1]
    return True, ""


def check_lesson(key, path, timeout):
    """The report row for one lesson, and a list of failure messages."""
    failures = []
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
    row = {"snippets": len(snippets), "snippetsPassed": snippets_passed, "exercises": len(exercises), "exercisesPassed": exercises_passed}
    return row, failures


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--only", nargs="*", default=None, help="lessons or courses to check, e.g. cs/complexity or lingua/spanish")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 2)
    parser.add_argument("--no-write", action="store_true", help="check only; leave the report as it is")
    args = parser.parse_args()

    selected = [
        (key, path) for key, path in lesson_dirs()
        if not args.only or any(key == o.rstrip("/") or key.startswith(o.rstrip("/") + "/") for o in args.only)
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
    print(f"verify_courses: {len(rows)} lessons, {snippets} runnable blocks, {exercises} Python exercises; {len(failures)} failure(s)")
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
        "lessons": {k: lessons[k] for k in sorted(lessons)},
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
