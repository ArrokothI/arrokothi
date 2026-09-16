# Validation manifest — K1.1-reference-01 round 8

Payload C8 `30397797852de07c561d27216b87526bbd091ba3`. Captured 2026-09-16T05:34:35Z UTC on Node v25.2.1, npm 11.6.2, git 2.39.5, Darwin 25.6.0.

**`REF1-R7-EVID-04`.** Round 7 claimed every log carried commit, timestamp and toolchain;
that was true of two of five. All five round-8 logs carry an identical seven-line header —
commit, UTC run time, Node, npm, git, platform, and a note saying which of those the log's
commands actually use — and every result is preceded by its command. The claim is now
checkable by reading the second through eighth line of each file.

| File | SHA-256 | What it proves |
|---|---|---|
| `00-scope-and-counts.log` | `f3c2fd986e12c407fe1aecb21549a6e2afaf5e22f8799364358103ffe3468441` | Whitespace census with classes named and totals (`REF1-R7-COUNT-03`); declared-path scope; executable, Layer-2 and sealed-record identity; revision-5 block byte-identity (`REF1-R7-QUOTE-02`); head binding |
| `01-digest-census.log` | `f3c0f2cb609c12e5e0a389f26aea898591e69c48664c609e249d6472b3d03b2b` | The digest census revision 6 got wrong (`REF1-R7-DIGEST-01`): 423 + 33 + 2 of 458, nothing unpinned; header-prose counter-measurement; exempted set 433 → 453 → 458 |
| `02-readme-and-sweep.log` | `c96a2a6a403ed97ffb15e2e7d9d9a6fce4ccc4800326436a42b62bbc2ede40dc` | `REF1-R7-WORD-05` closed; README confined to the two authorized sections; classified status sweep |
| `03-typecheck.log` | `7cc17c23a4ed470b748c4ae50cb976a86a3ed28e7d15110e3f06ac5eb908c735` | `npm run typecheck` exit 0 |
| `04-builder-docs.log` | `ac28ad45f1905d03b49726a460771257fdc4a2128b7350e7c2fbbfcc26afa97a` | `npm run check:builder-docs` 57/848/38, exit 0 |

Digests are mutually distinct and differ from the `a2051020811e29fd…` reused across
rounds 2–6, which `REF1-R6-EVID-01` identified.

Not rerun this round: `test:kernel`, `test:conformance`, `test:sdk`, `test:evals`.
Justification, checkable in `00` §3: no executable byte or dependency manifest differs
A→C8. Review-07 independently reran the full gate at H7a and reproduced 2322/356 with
0 failures on Node v22.22.3; the executable tree has not moved since.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1),
pre-existing at original B, reproduced by five reviewers including review-07. This machine
has Node 18 and 25 only and has never reproduced it. **No all-supported-Node green claim
is made.**
