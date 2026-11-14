"""K1.4 round 3: removed-fix ablations by source edit (design 04 §2.9, §6).

Each row reverts one fix by exact, unique text edits in a temporary copy of the working tree's
tracked and untracked files (node_modules linked), runs the named maintained tests there, and
records whether they fail. A row passes when the tests fail with the fix removed and pass without
the edits. Usage, from the repository root with Node v26.10.0 on PATH:

    python3 -I docs/development/work/K1.4/implementation-03/ablate.py > docs/development/work/K1.4/implementation-03/ablations.log

The in-test ablations (B-RECONCILE-ABLATION, B-REPORT-ABLATION, B-UNSCHEDULABLE-ABLATION and the
(row, label) pairs of B-TERM-ABLATION) run in `npm test` itself and are not repeated here. Removing
the unschedulable detector by source edit is not a row: without it the phantom-READY test would spin
in microtasks with nothing to stop it, so B-UNSCHEDULABLE-ABLATION removes it with a spin guard.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path.cwd()
DRIVER = "packages/sdk/src/legacy-bridge/driver.ts"
PROGRESS = "packages/sdk/tests/bridge-progress.test.ts"

ROWS = [
    {
        "id": "R2-01 reconcile READY members on a continue",
        "edits": [(DRIVER, "      if (decision.kind === \"continue\") this.reconcile(executionId, first);\n", "")],
        "tests": [PROGRESS],
        "pattern": "B-ENQUEUE-LOST-CAP|B-ENQUEUE-LOST-MODEL|B-RECONCILE-STARVE",
    },
    {
        "id": "D04-CHK-01 reconcile even when the lineage has queued work (design 04 2.1's idle-only rule)",
        "edits": [(DRIVER, "      if (decision.kind === \"continue\") this.reconcile(executionId, first);\n",
                   "      if (decision.kind === \"continue\" && !this.scheduler.hasQueued(executionId)) this.reconcile(executionId, first);\n")],
        "tests": [PROGRESS],
        "pattern": "B-RECONCILE-STARVE|B-RECONCILE-MANY",
    },
    {
        "id": "D04-CHK-01 the detector needs an actual claim of the member",
        "edits": [(DRIVER, "        if (claims > prior.claims) throw new UnschedulableReadyError(member, revision);\n",
                   "        if (claims >= prior.claims) throw new UnschedulableReadyError(member, revision);\n")],
        "tests": [PROGRESS],
        "pattern": "B-RECONCILE",
    },
    {
        "id": "D04-CHK-02 a failed cleanup is still reported",
        "edits": [
            (DRIVER, """    try {
      await this.endLineage(executionId, site);
    } catch (cause) {
      // The lineage is stopped (`ended`) but its cleanup is unconfirmed: report that, through the
      // Kernel alone, and acknowledge nothing (D04-CHK-02).
      const ending = next.step === "fail" ? `; it was ending with ${new TextDecoder().decode(next.error)}` : "";
      return this.report(activation, `native cleanup at ${site} failed, so ${executionId}'s lineage is stopped but not confirmed ended: ${bounded(cause)}${ending}`);
    }
""", "    await this.endLineage(executionId, site);\n"),
            (DRIVER, """      try {
        await this.terminate(activation, grant, ledger, progress, failure(code, bounded(cause)), "exception");
      } catch (last) {
        // The last report needs only the Kernel (D04-CHK-02).
        this.ended.add(executionId);
        this.report(activation, `the legacy Driver could not end ${executionId}'s exchange after ${bounded(cause)}: ${bounded(last)}`);
      }
""", "      await this.terminate(activation, grant, ledger, progress, failure(code, bounded(cause)), \"exception\").catch(() => undefined);\n"),
        ],
        "tests": [PROGRESS],
        "pattern": "B-FAULT-CLEANUP|B-UNSCHEDULABLE-CLEANUP",
    },
    {
        "id": "R2-02 the accounting hold's cascade (review 02's mutant)",
        "edits": [(DRIVER, "      await this.endLineage(executionId, \"hold\");\n", "")],
        "tests": ["packages/sdk/tests/bridge-terminate.test.ts"],
        "pattern": "T13",
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
            unique = True
            for path, before, after in row["edits"]:
                target = dest / path
                text = target.read_text()
                if text.count(before) != 1:
                    print(f"{row['id']}: anchor not unique in {path} ({text.count(before)})")
                    unique = False
                    break
                target.write_text(text.replace(before, after))
            if not unique:
                failures += 1
                continue
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
