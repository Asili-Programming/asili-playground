#!/usr/bin/env python3
"""Builds samples/manifest.json from the sample files, so the sample picker is generated, not
hand-kept. A sample declares its labels in its first lines:

    # sw: Karibu (Fibonacci)
    # en: Welcome (Fibonacci)

`sw` is required; `en` is optional (the Swahili label is used when it is missing). A file without
a `sw:` line is an error, so a sample cannot reach the picker unlabelled.

A sample that drives the virtual board also scripts its pin levels, one line per change:

    # in: 0 3 0      (at 0 ms, pin 3 is low)
    # in: 5 3 1      (at 5 ms, pin 3 is high)

Each line is `saa pini hali`: clock in milliseconds, pin number, and 0 or 1. The page sends these
with the program; the manifest keeps them as `inputs`.

    scripts/gen_samples.py          write samples/manifest.json
    scripts/gen_samples.py --check  exit 1 if the committed manifest is stale (CI)
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
MANIFEST = SAMPLES / "manifest.json"


def labels(path: pathlib.Path) -> dict:
    found = {"inputs": []}
    for line in path.read_text(encoding="utf-8").splitlines()[:5]:
        for key in ("sw", "en"):
            prefix = f"# {key}:"
            if line.startswith(prefix):
                found[key] = line[len(prefix):].strip()
    if "sw" not in found:
        sys.exit(f"{path.name}: missing a '# sw: <label>' line in its first five lines")
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# in:"):
            fields = line[len("# in:"):].split()
            if len(fields) != 3 or not all(f.lstrip("-").isdigit() for f in fields) \
                    or fields[2] not in ("0", "1"):
                sys.exit(f"{path.name}: bad '# in:' line {line!r} (want: saa pini 0|1)")
            found["inputs"].append([int(f) for f in fields])
    return found


def build() -> str:
    entries = []
    for path in sorted(SAMPLES.glob("*.as")):
        found = labels(path)
        entries.append({
            "id": path.stem,
            "file": path.name,
            "label": found["sw"],
            "label_en": found.get("en", found["sw"]),
            "inputs": found["inputs"],
        })
    return json.dumps(entries, ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    text = build()
    if "--check" in sys.argv:
        current = MANIFEST.read_text(encoding="utf-8") if MANIFEST.exists() else ""
        if current != text:
            sys.exit("samples/manifest.json is stale: run scripts/gen_samples.py")
        print("samples/manifest.json is up to date")
        return
    MANIFEST.write_text(text, encoding="utf-8")
    print(f"wrote {MANIFEST.relative_to(ROOT)} ({text.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
