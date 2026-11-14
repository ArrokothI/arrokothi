"""Read the retained CI download; never dispatch, retry, or execute CI."""
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
C = "72d452bb39e0ae0f846d85e273441d06a9cd22fb"
artifact = json.loads((root / "ci-artifacts.json").read_text())["artifacts"][0]
archive = root / "ci-artifact.zip"
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
assert artifact["id"] == 13912370616
assert artifact["name"] == f"packet-verify-{C}"
assert artifact["digest"] == f"sha256:{digest}"
assert digest == "bb0c66324851f55cf0fb2548084f01d3e052adb04c37e2fe3f18351e4d17eda1"
assert f"REVISION: {C}" in (root / "ci-revision.log").read_text()
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    summary = json.loads(z.read("summary.json"))
    verify = json.loads(z.read("verify.json"))
    run = dict(line.split("=", 1) for line in z.read("run.txt").decode().splitlines())
assert summary == json.loads((root / "ci-summary.json").read_text())
assert run["revision"] == run["head"] == verify["revision"] == C
assert run["exit"] == "0"
assert verify["environment"]["node"] == "v26.10.0"
assert summary["result"] == verify["result"] == "checks_passed"
checks = summary["checks"]
assert len(checks) == len(verify["checks"]) == 19
assert [c["id"] for c in checks] == [c["id"] for c in verify["checks"]]
assert sum(c["passed"] is True for c in checks) == 19
assert all(c["passed"] is True for c in verify["checks"])
mutants = {}
for check in verify["checks"]:
    if "mutant" not in check["id"]:
        continue
    result = check["result"]
    rows = [m for case in result["cases"] for m in case["mutations"]]
    killed = sum(m["status"] == "killed" and m["invalid"] is False for m in rows)
    assert killed == len(rows) == result["counts"]["killed"]
    mutants[check["id"]] = killed
print(json.dumps({
    "revision": C, "artifact_id": artifact["id"], "sha256": digest,
    "checks_counted": len(checks), "passed_counted": sum(c["passed"] is True for c in checks),
    "tests": {c["id"]: c["counts"] for c in checks if c.get("counts")},
    "mutants_counted": mutants, "result": "passed",
}, indent=2))
