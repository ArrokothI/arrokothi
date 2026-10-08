# TOOLS-01 gate stop 02 — owner choice 06's measurements exceed both limits

2026-10-05. Claude Code (`claude-opus-5-5`), implementer. [Owner choice 06](owner-choice-06.md)
("Measure before building") with the owner's step 2: stop if (a) > 50 or (b) > 200. Both are
exceeded, so rules 1–3 are not built and no origin is closed. TOOLS-01 remains IN_PROGRESS.

**Method.** Rules 1–3 applied at `3cfda480` to the committed area map and derivation of
[gate-design-01](gate-design-01.md).
[measure.py](gate-stop-02/measure.py) reproduces the counts;
[measurement.json.gz](gate-stop-02/measurement.json.gz) (SHA-256 `26945bec…2052b`) lists the origins.
664 open origins name nothing and become `ungated` (654 pending, 10 pending_revalidation).

## (a) TOOLS-01's own gate: 64 pending origins (limit 50)

Under rule 1, 65 of TOOLS-01's 177 changed paths bear behaviour. They touch four areas. The 44
transferred origins are excluded (rule 3). The other origins blocked:

| Touched area | Blocked | Only this area |
|---|---:|---:|
| `package.json` (Node floor, owner choice 03) | 43 | 26 |
| `package-lock.json` (same) | 24 | 3 |
| `tests/conformance/effects` (the floor test fix) | 17 | 7 |
| `tooling` | 9 | 4 |

That is 64 distinct origins: 52 mentions and 12 artifacts, 24 of them in more than one area. The
floor's two manifest edits touch 50 of them, 43 only through those files; without the manifests,
(a) would be 14. These sections cite `package.json` the way the excluded sections cite `007` or
`AGENTS.md`, but rule 1 treats `package.json` as behaviour-bearing.

## (b) A change under `packages/kernel/`: 324 open origins (limit 200)

297 `pending` and 27 `pending_revalidation`, from one area: the map gives the whole kernel package
the single area `packages/kernel`. By source: K1.2-correction-01 143, K1.1 87, K1.2 55,
K1.1-correction-02 15, K1.1-correction-01 14, others 10.

The most cited names:
- `packages/kernel/src` 74, and `packages/kernel/src/*.ts` 25;
- `coordinator.ts` 70 and `values.ts` 36;
- `packages/kernel/tests` 30, and `tests/*.test.ts` 41;
- `packages/kernel` 28.

100 of the 324 name only kernel directories or absent files. Per-file kernel areas would not get
under 200 for a single-file change either: `coordinator.ts` alone would block 144 and `values.ts`
114, and K1.x packets change several files.

## Decision needed

Owner choice 06 leaves the blocking-or-advisory choice to the owner if (b) exceeds 200. (a) also
exceeds the 50-origin stop, mostly through the Node-floor manifest edits.
