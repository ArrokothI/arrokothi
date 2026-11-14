"""K1.4 correction round 2: removed-fix ablations that have no in-test seam.

Each row reverts one fix by an exact, unique text edit in a temporary copy of the working tree's
tracked and untracked files (node_modules linked), runs the named maintained tests there, and
records whether they fail. A row passes when the tests fail with the fix removed and pass without
the edit. Usage, from the repository root with Node v26.10.0 on PATH:

    python3 -I docs/development/work/K1.4/implementation-02/ablate.py > docs/development/work/K1.4/implementation-02/ablations.log

The in-test ablations (B-OBSERVE-ABLATION, B-NOTIFY-ABLATION, B-ACK-ABLATION, B-TERM-ABLATION) run in
`npm test` itself and are not repeated here.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path.cwd()

ROWS = [
    {
        "id": "R1-02 retained destination",
        "path": "packages/sdk/src/application.ts",
        "before": "      if (destination === undefined && request.requestKey !== undefined) destination = acceptedDestination(executionId, requestKey);\n",
        "after": "",
        "tests": ["packages/sdk/tests/bridge-ingress.test.ts"],
        "pattern": "B-INPUT-RETRY",
    },
    {
        "id": "R1-04 scheduler before the hook",
        "path": "packages/sdk/src/application.ts",
        "before": "  const services: ApplicationServices = { store, definitions, scheduler, catalog, models };\n  const overrides = options.controllers?.(services);\n",
        "after": "  const services: ApplicationServices = { store, definitions, scheduler: undefined as never, catalog, models };\n  const overrides = options.controllers?.(services);\n  (services as { scheduler: unknown }).scheduler = scheduler;\n",
        "tests": ["packages/sdk/tests/bridge-observe.test.ts", "packages/sdk/tests/bridge-inventory.test.ts"],
        "pattern": "B-HOOK-SERVICES|S-OPT-NATIVE",
    },
    {
        "id": "R1-03 unknown for a failed forward",
        "path": "packages/sdk/src/legacy-bridge/driver.ts",
        "before": "          ledger.unknown(index, INGRESS_REASONS.forwardFailed, detail);\n",
        "after": "          ledger.record(index, { status: INGRESS_STATUS.discarded });\n",
        "tests": ["packages/sdk/tests/bridge-ingress.test.ts"],
        "pattern": "B-ACK-EXITS",
    },
    {
        "id": "R1-03 never a second forward",
        "path": "packages/sdk/src/legacy-bridge/driver.ts",
        "before": "        if (attempted.has(event.eventId)) {",
        "after": "        if (false as boolean) {",
        "tests": ["packages/sdk/tests/bridge-ingress.test.ts"],
        "pattern": "B-ACK-ONCE",
    },
    {
        "id": "R1-01 step loop waits for the in-flight enqueue",
        "path": "packages/sdk/src/legacy-bridge/driver.ts",
        "before": "        if (record) return decision;\n",
        "after": "        return decision;\n",
        "tests": ["packages/sdk/tests/bridge-deadline-cancel.test.ts"],
        "pattern": "B-RES",
    },
]


def copy_tree(dest: Path) -> None:
    listed = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                            cwd=ROOT, check=True, capture_output=True).stdout.split(b"\0")
    for raw in listed:
        if not raw:
            continue
        name = raw.decode()
        source = ROOT / name
        if not source.is_file():
            continue
        target = dest / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    os.symlink(ROOT / "node_modules", dest / "node_modules")


def run(dest: Path, row: dict) -> subprocess.CompletedProcess:
    argv = ["node", "--test", "--experimental-strip-types", "--test-name-pattern", row["pattern"], *row["tests"]]
    return subprocess.run(argv, cwd=dest, capture_output=True, text=True, timeout=600)


def summary(result: subprocess.CompletedProcess) -> str:
    lines = [line for line in result.stdout.splitlines() if line.startswith(("ℹ tests", "ℹ pass", "ℹ fail"))]
    return f"exit {result.returncode}; " + "; ".join(line[2:] for line in lines)


def main() -> int:
    failures = 0
    print(f"node {subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()}")
    for row in ROWS:
        with tempfile.TemporaryDirectory(prefix="k14-ablate-") as tmp:
            dest = Path(tmp)
            copy_tree(dest)
            control = run(dest, row)
            target = dest / row["path"]
            text = target.read_text()
            if text.count(row["before"]) != 1:
                print(f"{row['id']}: anchor not unique ({text.count(row['before'])})")
                failures += 1
                continue
            target.write_text(text.replace(row["before"], row["after"]))
            ablated = run(dest, row)
            caught = control.returncode == 0 and ablated.returncode != 0
            failures += 0 if caught else 1
            print(f"{row['id']}: {'CAUGHT' if caught else 'NOT CAUGHT'}")
            print(f"  control (fix present): {summary(control)}")
            print(f"  ablated (fix removed): {summary(ablated)}")
            failed = [line.strip() for line in ablated.stdout.splitlines() if line.lstrip().startswith("✖") and "failing tests" not in line]
            for line in dict.fromkeys(failed):
                print(f"    {line}")
    print("all caught" if failures == 0 else f"{failures} not caught")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
