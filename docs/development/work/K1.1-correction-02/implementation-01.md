# Implementation report — K1.1-correction-02, round 1

## Identity

- Packet: K1.1-correction-02, a correction of accepted K1.1. [Contract](contract.md) at C; governing
  process baseline: integrated main `70467f4cf76896529486499db24fcaa953292491`.
- State: WAITING_FOR_REVIEW. Owner release: explicit owner instruction, 2026-09-23. Prerequisite:
  K1.1 accepted at H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`.
- Author: Claude Code session (Claude Opus 5.5), 2026-09-23, at the owner's instruction.
- Branch `claude/pre-k1.2-reviews` on `origin` (https://github.com/ArrokothI/arrokothi.git).
  Branch base: `70467f4cf76896529486499db24fcaa953292491`.
- Code payload origin: `66e9e8420f422c83d66cbd4e99b3541513c6a16b`, parent
  `227cd05373f5c5f2d4dbb3e8a6d9ff3cd6c23b3f`, already integrated at `70467f4`. Payload commits on
  this branch: `dc1834df131e174b62f728270e3bcfe94d65b670` (records, comments, baseline, provenance) and
  C = `d8f7ef473944eaf48ea1d05b2004d2cfce59669e` (ledger packet section). No previous review.
- Candidate H: the commit containing this report; its full SHA is supplied in the external handoff.
- C..H allowlist: this report, `validation-01/*.txt` (output-only attachments below) and the K1.1-
  correction-02 status row in `docs/development/007-work-packets.md`.
- Working tree clean at C; push status is supplied in the external handoff.

**Process departure, disclosed.** The code change reached main (PR #35) before this packet or any
review existed. It is reviewed here as `git diff 227cd05 <H> -- packages/kernel/`; `packages/kernel/`
is identical at `66e9e84` and `70467f4`.

## Changes and coverage

- **Capture cost (KC2-1–KC2-3).** `packages/kernel/src/values.ts` gains a running canonical byte count
  in `CaptureState` (`bytes`, `stopped`), a `charge` helper that records one root-located
  `too_many_bytes` issue and stops reading once the count passes 1,048,576, exact per-kind charges
  (literals, number spelling, `canonicalStringBytes` for strings, `containerStructureBytes` for
  punctuation), and early exits in the array and object loops. Refused content is charged for the
  reading it caused. The finished-bytes check is retained.
- **Tests.** Five new tests in `packages/kernel/tests/values.test.ts`, under "refusing a value costs no
  more than the size limit allows"; the three amplifying cases run in child processes with a
  60-second kill. No existing test was changed or removed.
- **Comments (KC2-5).** Two comments quoted a `values.md` sentence the rewrite replaced; they now quote
  "Two sibling roots of about 700 KiB each, in one Outcome, both pass."
- **Records (KC2-6).** [Decision 01](decision-01.md) records V-D1 (bounded refusal cost, new, required
  this change), V-D2 (collision-resistant tombstone digest, new precision, no implementation yet) and
  V-D3 (single read per envelope field, accepted K1.1 behavior promoted to architecture wording). 002
  gains one sentence; `mental-model/sources.md` gains one provenance paragraph.
- **Selected 012 methods.** Deterministic execution (KC2-1–KC2-4), including an ablation against the
  pre-fix code; normative examination (KC2-6). Race/fault, native, external-gate and packaging methods
  do not apply: no ordering, persistence, Driver or release claim is made.
- **Semantic correction closure.** Changed invariant: refusal cost is bounded by the size limit, not by
  a value's expanded size. Dependent paths: every root captured by the in-process binding — creation
  input, ingress payloads, and any root K1.2 later captures from an Outcome. All go through the same
  `capture` entry, so K1.2 inherits the bound. The wire-decoder path does not exist yet. Accepted
  results cannot change, because charges on accepted content sum to exactly its canonical size;
  the exactness test pins that at the limit and one byte past it.

## Validation and interpretation

Environment: macOS 26.6.2, Node v25.2.1, npm 11.6.2, repository root. Commands ran on the clean tree
at `dc1834d` (identical code to C); the builder check was rerun at C after the ledger edit.

| Command | Result | Attachment (SHA-256) |
|---|---|---|
| `npm run typecheck` | exit 0 | `validation-01/typecheck.txt` (`a2051020…4be`) |
| `node --test --experimental-strip-types packages/kernel/tests/*.test.ts` | exit 0; 269 tests, 269 pass, 0 fail/cancelled/skipped | `validation-01/kernel.txt` (`8366095d…ba375eb`) |
| `npm test` | exit 0; 2,323 tests / 356 suites, 0 fail/cancelled/skipped (2,318 at DOCS-CLEANUP-01 plus these 5) | `validation-01/full.txt` (`7cc01ed4…1b4ff0d`) |
| `npm run check:builder-docs` (at C) | exit 0; 72 Markdown files, 1,684 links/anchors, 38 imports | `validation-01/builder.txt` (`17644e56…9e22b50`) |
| Ablation: new tests against `git show 227cd05:packages/kernel/src/values.ts` in a detached worktree | exit 1; 1 pass, 4 fail — see below | `validation-01/ablation.txt` (`8baa077b…76b3e6ecda`) |

Full digests: ablation `8baa077b124630da63efad85a4425b2ee29d3e29a204235384965d76b3e6ecda`, typecheck `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be`, kernel
`8366095db5b0330ddbcc4f8e4538b515da8d1e94d8c728962f9e22b50ba375eb`, full
`7cc01ed421fa6089184c5738d5e785fa492374d231cedec3bbc85c071743f803`, builder
`17644e561e0a88828793c1cd0ae479d82f07f3216db33ce4765aeca3e1b4ff0d`.

**Ablation reading.** Against the pre-fix code, the three amplifying tests each hit the 60-second
kill (unbounded work). The exactness test fails only on its message assertion: the old code makes the
same accept/refuse decision at 1,048,576 and 1,048,577 bytes, through the finished-bytes check. The
accepted shared-member test passes. So the tests distinguish the bounded implementation from the
unbounded one, and the new code changes no accept/refuse outcome.

Not run: Node 22 (the historical K1.1 cancellation limitation is unaffected), benchmark gates, and any
wire decoder (none exists). Implementer assessment, not acceptance: KC2-1–KC2-6 are supported by the
evidence above. Strongest remaining risk: a byte-kind whose charge differs from JCS output in a case
the exactness test does not cover; the retained finished-bytes check still refuses such a value, so
the risk is refusing on the running count a value that JCS would size one or more bytes smaller.

Third-party review: none; no new source, dependency or asset.

## Handoff

Ready for independent review. Base, C and H SHAs and the verified push are supplied externally. No
self-acceptance; K1.2 remains released but unstarted, and this packet releases nothing.
