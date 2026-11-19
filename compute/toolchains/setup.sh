#!/usr/bin/env bash
# Install the toolchains that compute/verify_courses.py uses to run the ```<lang> check blocks of the
# programming-language courses (content/cs/languages/*). Nothing here is needed to build the site.
#
# Toolchains that ship as a tarball are unpacked into $LUMENARY_TOOLCHAINS (default
# ~/.cache/lumenary-toolchains); the rest are Docker images. verify_courses.py skips (and reports as
# skipped) any block whose toolchain is missing, so installing a subset is fine.
#
# Usage: compute/toolchains/setup.sh [name ...]   (no names: everything)
set -euo pipefail
T="${LUMENARY_TOOLCHAINS:-$HOME/.cache/lumenary-toolchains}"
mkdir -p "$T" "$T/bin"
want() { [ $# -eq 0 ] || [[ " $WANT " == *" $1 "* ]]; }
WANT="${*:-}"
fetch() { curl -fsSL --retry 3 "$1" -o "$2"; }
gh_latest() { curl -fsSL "https://api.github.com/repos/$1/releases/latest" | python3 -c "import json,sys;print(json.load(sys.stdin)['tag_name'])"; }

if [ -z "$WANT" ] || want go; then
  v=$(curl -fsSL "https://go.dev/dl/?mode=json" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['version'])")
  rm -rf "$T/go" && fetch "https://go.dev/dl/$v.linux-amd64.tar.gz" "$T/go.tgz" && tar -C "$T" -xzf "$T/go.tgz" && rm "$T/go.tgz"
  ln -sf "$T/go/bin/go" "$T/bin/go"; echo "go $v"
fi
if [ -z "$WANT" ] || want zig; then
  url=$(curl -fsSL https://ziglang.org/download/index.json | python3 -c "import json,sys;d=json.load(sys.stdin);v=sorted([k for k in d if k!='master'],key=lambda s:[int(p) for p in s.split('.')])[-1];print(d[v]['x86_64-linux']['tarball'])")
  rm -rf "$T/zig" && mkdir "$T/zig" && fetch "$url" "$T/zig.txz" && tar -C "$T/zig" --strip-components=1 -xJf "$T/zig.txz" && rm "$T/zig.txz"
  ln -sf "$T/zig/zig" "$T/bin/zig"; echo "zig $url"
fi
if [ -z "$WANT" ] || want julia; then
  url=$(curl -fsSL https://julialang-s3.julialang.org/bin/versions.json | python3 -c "
import json,sys;d=json.load(sys.stdin);v=sorted([k for k,x in d.items() if x['stable']],key=lambda s:[int(p) for p in s.split('.')])[-1]
print([f['url'] for f in d[v]['files'] if f['os']=='linux' and f['arch']=='x86_64' and f['kind']=='archive'][0])")
  rm -rf "$T/julia" && mkdir "$T/julia" && fetch "$url" "$T/julia.tgz" && tar -C "$T/julia" --strip-components=1 -xzf "$T/julia.tgz" && rm "$T/julia.tgz"
  ln -sf "$T/julia/bin/julia" "$T/bin/julia"; echo "julia $url"
fi
for jdk in 21 25; do
  if [ -z "$WANT" ] || want "jdk$jdk"; then
    rm -rf "$T/jdk$jdk" && mkdir "$T/jdk$jdk"
    fetch "https://api.adoptium.net/v3/binary/latest/$jdk/ga/linux/x64/jdk/hotspot/normal/eclipse" "$T/jdk.tgz"
    tar -C "$T/jdk$jdk" --strip-components=1 -xzf "$T/jdk.tgz" && rm "$T/jdk.tgz"; echo "jdk $jdk"
  fi
done
if [ -z "$WANT" ] || want kotlin; then
  v=$(gh_latest JetBrains/kotlin); rm -rf "$T/kotlinc"
  fetch "https://github.com/JetBrains/kotlin/releases/download/$v/kotlin-compiler-${v#v}.zip" "$T/kotlin.zip" && (cd "$T" && unzip -q kotlin.zip && rm kotlin.zip); echo "kotlin $v"
fi
if [ -z "$WANT" ] || want dotnet; then
  fetch https://dot.net/v1/dotnet-install.sh "$T/dotnet-install.sh" && bash "$T/dotnet-install.sh" --channel 10.0 --install-dir "$T/dotnet" >/dev/null
  ln -sf "$T/dotnet/dotnet" "$T/bin/dotnet"; echo "dotnet $("$T/dotnet/dotnet" --version)"
fi
if [ -z "$WANT" ] || want dart; then
  rm -rf "$T/dart-sdk" && fetch https://storage.googleapis.com/dart-archive/channels/stable/release/latest/sdk/dartsdk-linux-x64-release.zip "$T/dart.zip" && (cd "$T" && unzip -q dart.zip && rm dart.zip)
  ln -sf "$T/dart-sdk/bin/dart" "$T/bin/dart"; echo "dart $(cat "$T/dart-sdk/version")"
fi
if [ -z "$WANT" ] || want scala; then
  fetch https://github.com/VirtusLab/scala-cli/releases/latest/download/scala-cli-x86_64-pc-linux.gz "$T/scala-cli.gz" && gunzip -f "$T/scala-cli.gz" && chmod +x "$T/scala-cli" && ln -sf "$T/scala-cli" "$T/bin/scala-cli"; echo "scala-cli"
fi
if [ -z "$WANT" ] || want lua; then
  f=$(curl -fsSL https://www.lua.org/ftp/ | grep -o 'lua-5\.[0-9.]*tar\.gz' | sort -uV | tail -1)
  rm -rf "$T/lua-src" && mkdir "$T/lua-src" && fetch "https://www.lua.org/ftp/$f" "$T/lua.tgz" && tar -C "$T/lua-src" --strip-components=1 -xzf "$T/lua.tgz" && rm "$T/lua.tgz"
  make -s -C "$T/lua-src" linux >/dev/null 2>&1 || make -s -C "$T/lua-src" posix >/dev/null; ln -sf "$T/lua-src/src/lua" "$T/bin/lua"; echo "lua $f"
fi
if [ -z "$WANT" ] || want chibi; then
  v=$(gh_latest ashinn/chibi-scheme); rm -rf "$T/chibi-src" && mkdir "$T/chibi-src"
  fetch "https://github.com/ashinn/chibi-scheme/archive/refs/tags/$v.tar.gz" "$T/chibi.tgz" && tar -C "$T/chibi-src" --strip-components=1 -xzf "$T/chibi.tgz" && rm "$T/chibi.tgz"
  make -s -C "$T/chibi-src" PREFIX="$T/chibi" >/dev/null 2>&1 && make -s -C "$T/chibi-src" PREFIX="$T/chibi" install >/dev/null 2>&1; echo "chibi $v"
fi
if [ -z "$WANT" ] || want cobol; then
  rm -rf "$T/cobol-src" && mkdir "$T/cobol-src" && fetch https://ftp.gnu.org/gnu/gnucobol/gnucobol-3.2.tar.xz "$T/cobol.txz" && tar -C "$T/cobol-src" --strip-components=1 -xJf "$T/cobol.txz" && rm "$T/cobol.txz"
  (cd "$T/cobol-src" && ./configure -q --prefix="$T/cobol" --without-db --without-curses --without-xml2 --without-json >/dev/null && make -s -j8 >/dev/null 2>&1 && make -s install >/dev/null 2>&1); echo "gnucobol 3.2"
fi
if [ -z "$WANT" ] || want python; then
  uv python install 3.13 >/dev/null 2>&1; ln -sf "$(uv python find 3.13)" "$T/bin/python3.13"; echo "python $("$T/bin/python3.13" --version)"
fi
if [ -z "$WANT" ] || want images; then
  for img in gcc:14 swift:latest php:cli ruby:latest haskell:latest ocaml/opam:debian-ocaml-5.4 elixir:latest clojure:temurin-21-tools-deps swipl:latest gnuoctave/octave:latest freepascal/fpc:latest alire/gnat:latest; do
    docker pull -q "$img" >/dev/null 2>&1 && echo "image $img" || echo "image $img FAILED"
  done
fi
