"""Independent review 06 of K1.4: binds Packet verify run 43569826480's artifact to C and counts its checks.

Usage (from the repository root; the artifact is untrusted data, so extract it into its own empty directory):
  mkdir /tmp/k14-r06-artifact && unzip -q docs/development/work/K1.4/review-06/ci-artifact.zip -d /tmp/k14-r06-artifact
  python3 -I docs/development/work/K1.4/review-06/inspect-ci.py /tmp/k14-r06-artifact
Reads summary.json, verify.json and run.txt from that directory and the packet spec from Git at C.
Prints one JSON object and exits 1 if any binding or count fails.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

C = "5b81a1b0cd9e73d7591ea23fd29195e24536d50d"
SPEC = "docs/development/work/K1.4/verification.json"
root = pathlib.Path(sys.argv[1])
problems = []


def need(condition, message):
    if not condition:
        problems.append(message)


summary = json.loads((root / "summary.json").read_text())
verify = json.loads((root / "verify.json").read_text())
run = dict(line.split("=", 1) for line in (root / "run.txt").read_text().splitlines() if "=" in line)
spec = json.loads(subprocess.run(["git", "show", f"{C}:{SPEC}"], check=True, capture_output=True).stdout)

need(run.get("revision") == C and run.get("head") == C, "run.txt revision/head is not C")
need(run.get("spec") == SPEC and run.get("exit") == "0", "run.txt spec or exit")
need(verify["revision"] == C and verify["specification"] == SPEC, "verify.json revision/specification")
need(verify["result"] == "checks_passed" and verify["result_reuse"] is False, "verify.json result or reuse")
need(summary["result"] == "checks_passed" and summary["error"] is None, "summary.json result")

checks = summary["checks"]
passed = [check["id"] for check in checks if check["passed"] is True]
need(len(checks) == len(passed), "a summary check did not pass")
need(len({check["id"] for check in checks}) == len(checks), "duplicate summary check id")
declared = [check["id"] for check in spec["checks"]]
need(set(declared) <= set(passed), "a declared check is missing from the summary")
need([check["id"] for check in verify["checks"]] == [check["id"] for check in checks], "verify.json and summary.json list different checks")
need(all(check["passed"] is True for check in verify["checks"]), "a verify.json check did not pass")
need(all(check.get("exit") in (0, None) for check in verify["checks"]), "a verify.json command exited non-zero")

mutations = {}
for check in verify["checks"]:
    result = check.get("result")
    if check.get("operation") != "mutations":
        continue
    need(result["revision"] == C, f"{check['id']}: revision")
    need(result["result"] == "selected_cases_passed", f"{check['id']}: result")
    need(set(result["counts"]) == {"killed"}, f"{check['id']}: a count other than killed is present")
    mutations[check["id"]] = {"result": result["result"], "counts": result["counts"], "registry_cases": len(result["cases"])}

tests = {check["id"]: check["counts"] for check in checks if check.get("counts")}
print(json.dumps({
    "run": run,
    "summary_sha256": hashlib.sha256((root / "summary.json").read_bytes()).hexdigest(),
    "verify_sha256": hashlib.sha256((root / "verify.json").read_bytes()).hexdigest(),
    "summary_checks": len(checks),
    "summary_passed": len(passed),
    "declared_in_spec_at_C": len(declared),
    "in_summary_but_not_declared": sorted(set(passed) - set(declared)),
    "counts": tests,
    "mutations": mutations,
    "profiles_not_run": [profile["id"] for profile in verify["profiles_not_run"]],
    "acceptance": verify["acceptance"],
    "problems": problems,
}, indent=2))
sys.exit(1 if problems else 0)
