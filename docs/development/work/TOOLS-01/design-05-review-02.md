# TOOLS-01 — resumed step-0 review, design 05 revision 3

2026-10-03, Codex implementer (GPT-6 per owner assignment). **Design accepted for implementation.**
This is not independent packet acceptance or hold release. TOOLS-01 remains IN_PROGRESS.

After fetch, local and origin `codex/tools-01` were clean and equal at
`4dea56638303162b10494e82990d9a54816ca57e`. Reviewed the delta from
`60eadf397b0f5a7f11880eb8924e73fdd51dcae8` (only `design-05.md`), its resulting §2.3, contract
diff, schema/tool changes, census, estimates, order and owner answers against
[the original step-0 review](design-05-review.md). That earlier review's whole-design coverage
and governing 006/012 baseline still apply; it is preserved unchanged.

## D05-REV-01 closure

The original changed/removed `unusedHook` variants now fail the effectful-initializer rule
regardless of binding liveness. Removing the call is checked at the pin, not merely against
what remains at C. An unchanged hook reading a changed constant is covered by the prefix's
hook roots and transitive lexical reference closure. The same closure reaches indirect
initializers and helpers called by earlier tests. Earlier changed leaf callbacks are effectful
differences; removing leaf spans no longer hides those changes. Changed import requests,
property reads, destructuring, tagged templates and classes are refused rather than inferred
effect-free. This addresses the original mechanism and the adjacent forms §2.3 enumerates.

Load-time differences apply throughout the file; later unused inert functions can be admitted,
but later effectful setup cannot. Concurrency falls back to treating every leaf as earlier.
Per-file process isolation, helper module top-level identity/review and the separate traced-read
run cover additional observable setup. A10/A11 must establish the runtime assumptions on 22.9;
they have not been run at this acceptance point.

The owner explicitly selected Q8's label: changed non-fixture repository reads and production
imports are subjects of the tests and are counted separately, rather than represented as
unchanged inputs. The P1-P claim is now test-side code, fixtures and assertions. Changed fixtures
refuse preservation even with whole-file identity. The native/non-fs/cleared-environment read
gaps and production state limit are stated; these guards are not a universal semantic proof.
Trace verdict divergence refuses credit; traced execution cannot substitute for verdict runs.

## Recorded implementation clarifications

These apply the design's explicit rules, without changing its mechanism or contract patch:

- The positive control “any change after the member” means changes outside its defined prefix.
  It cannot exempt effectful load-time code after that member; §2.3 explicitly includes all
  load-time code, at either revision, and refuses such changes.
- The abbreviated P1-P phrase “inert declaration” uses §2.3's enumerated classes, including
  qualifying import changes and registration heads. It does not authorize a broader purity
  analysis, or omit the referenced-name check and name/fullName exception.
- A9 and A10 retain their explicit refusal/conservative fallbacks. Other failed floor
  assumptions, and failed process isolation, stop implementation; they are not silently adapted.

## Consequences and remaining verification

The delta consistently replaces residue fields with prefix/read fields, adds `read-trace.mjs`,
counts preservation refusals and both changed-data labels, expands step 1 to A1–A11 and changes
steps 6/8. The proposed 329 = 47 kept + 282 prefix-refused and 346 = 43 changed + 282 + 21
read-refused reconcile arithmetically. At 15–20 minutes each, 346 targets take 14.4–19.2 six-hour
days; E2's new 20.5–26-day budget includes the previously omitted work. Register classification
now allows 1.5–2.5 days. These are planning figures: the new read/prefix census was not independently
re-executed during this delta review and must be checked or differences explained in step 6.

The unaffected obligations stay in force: all 1,549 origins; 124 executable revalidations and
30 non-executable rechecks; no held/superseded suite credit; target/census/reading counts separated;
unconditional area gate; TOOLS-01 extraction of sealed logs; clean-C/P2 and independent review.
The design author retains the 007 edit. No production, Layer-3, sealed record or fault-oracle edit
is authorized.

The first embedded option-C diff was extracted unchanged (55 lines), SHA-256
`fc07047b6e6f4583f9cfb3d6015ef7e4c2ad16fd0edf15c0a86ab58e3475edf0`.
Both `git apply --check` and `patch -p1 --dry-run` passed against live contract revision 2 with
no offset or fuzz. Step 0 applies that exact patch and records the owner's answer verbatim in
[owner-choice-02.md](owner-choice-02.md). No new dependency or third-party source is used.

Next: commit step 0, then install checksum-verified Node v22.9.0 alongside the existing Node,
and execute the floor checks in step 1. Design acceptance does not presume they pass.
