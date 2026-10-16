# Design check — design 03, K1.1-correction-03

**Record type:** owner-relayed design check, recorded verbatim below on 2026-10-16 in the
first build commit. It authorizes the build under [owner choice 02](owner-choice-02.md) and
[design 03](design-03.md), with the amendment and conditions below. It is not acceptance,
a hold release or a successor release.

**Recording provenance:** Codex Desktop build session `01a1460f-48f6-79e3-8318-77aa6f29d423`,
model `gpt-6-astra`, reasoning `xhigh` (local session metadata). This build session differs
from design 03's session `01a13f97-1cb0-7fe0-8377-11757e0894b1` and both earlier review sessions.
The check was relayed directly by the owner in this build session; the delegated checker's
session was not independently accessed.

The owner's check, verbatim:

```text
Design check for design-03 (owner, relaying the delegated Claude Code claude-opus-5-5 check,
2026-10-16): APPROVED with one owner amendment and two conditions. Proceed to build.

Owner amendment to owner-choice-02 §2 (assertion vocabulary): `assert.match` and `assert.doesNotMatch`
qualify when the first operand is a primitive string and the second is a RegExp literal created in
the test file (clean RegExp prototype under the same intrinsic-snapshot check), with an optional
primitive string message. All other excluded forms stay excluded.

Conditions:
- D1: Test-side instrumentation and witness modules add no load-time intrinsic reference to importing
  test files (the round-1 trap fixed in 4ba01872). Where a test is rewritten to obtain a qualifying
  assertion, the new assertion checks the same obligation as before. List each rewrite, and reopen
  and transfer any affected origin under the standing rule.
- D2: Keep the prescribed verify practical. If the maintained continuation search would take the full
  verify past about 2 hours, verify runs a declared subset. The full search runs once at C as recorded
  evidence with its log and counts, and the report states both.
```
