# K1.4-candidate design 02 — the correction after review 01

Written 2026-11-15 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`), before the
round-2 payload. It answers the three questions of
[brief 02](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01/brief-02.md),
which governs this round, under [owner choice 03](owner-choice-03.md). It changes nothing in
[design 01](design-01.md) or [addendum 01](design-01-addendum-01.md) except where it says so.

Ownership is unchanged: test-side adapter code, evidence tooling data and one Layer-3 sentence. No Kernel,
Runtime, Driver or deployment semantics change, and `packages/` stays byte-identical to B.

## 1. Binding provenance (R02-1, K14C-R01-01)

**The mechanism that produced the finding.** Addendum §A3 said a pair is bound only when both sides are unbound,
and §A4 said a timeout with no alias takes the `to-<generation>` label. `Aliases.bind` returned nothing, so a
refused pair left its ID looking exactly like an ID no command had named. For Executions and wait generations
that is harmless, because an unnamed ID has one spelling, the Kernel's own. Timeout Events alone have a second
source of names, and there the label covered the conflict.

**Other defects the same mechanism allowed.** The label was computed at projection and never recorded, so it
was not in the name table at all. That allowed a second collision the review did not need to reach: a command
could name one timeout with another timeout's label, and both IDs were then shown under one name.

**The repair.** Timeout Events get their own table, `TimeoutNames`, one per Execution. It records how each ID is
shown and where that came from:

| Source | Meaning |
|---|---|
| `command` | A `deliver_timer` command named the ID the Kernel answered with |
| `convention` | No command has named it; it carries its own generation's `to-<generation>` label (Q2 b) |
| `exposed` | A name was offered for it that already denotes another ID; it is shown as `kernel-event:<id>` |

Three rules, for one Execution and one run:

1. **A name denotes at most one ID, for good.** The name map only grows, and it holds labels as well as command
   names. So the label is a binding, made and checked like any other.
2. **An ID is shown under one name at a time.** That name changes at most once: from its label to the first name
   a command gives it. This is addendum §A4 as written ("a timeout mailbox entry with no alias from a
   `deliver_timer` command"), and it keeps H's behavior for a later explicit name. A command-named ID keeps its
   first command name, as before.
3. **A name that would break rule 1 is not bound.** The ID it was offered for becomes `exposed` and stays so,
   whether the offer came from a command or from the label. The first binding is kept. The table never chooses
   which identity is right.

So only a timeout no command has named gets Q2 b's label, and a conflicting name is a literal identity
difference in the Observation. I chose exposure over a throw: a throw would end the run at that step and hide
what the Kernel did afterwards, and the difference is already visible to the runner's literal comparison.

**Naming contract.** Unchanged. Ordinary named and unnamed timeouts, later explicit naming, duplicate fires and
per-Execution scope behave as at H. `KERNEL_CANDIDATE_VERSION` stays `/1`: no capture has pinned it, and
K1.4-gate is not released.

**Maintained tests** (`conventions.test.ts`, "timeout names keep their provenance"):

| Case | Expectation |
|---|---|
| Review probe 1: two generations fired under the explicit name `to-g2` | Second ID exposed; first binding kept; it stays exposed through dispatch and inspect |
| Review probe 2: the Kernel's answer changes the ID on a duplicate fire (fault injection), named by the label and by another name | The changed ID is exposed; nothing else in the Observation moves |
| Unnamed, then named by its own label | Unchanged; a later different name does not rebind |
| Unnamed, then named differently | Takes the command's name once; its old label cannot name a second ID |
| A label that already denotes a command-named timeout | The unnamed ID is exposed, and a later free name cannot undo that |
| A command name that denotes another timeout, offered to a labelled timeout | That ID is exposed |
| Duplicate fire under the same name; fire of an ended generation | Nothing changes, nothing is renamed |
| The same name and label in two Executions | No conflict |

Six of these fail against H's candidate; the other three hold there and pin preserved behavior.

## 2. Registering the ablations (R02-2, K14C-R01-02)

**Answer: registered, with no packet-tools change and no waiver.** `scripts/` and `tests/tooling/` stay at B.

**What the existing workflow needs**, read from `scripts/packet_tools.py` at B:

| Requirement | How it is met |
|---|---|
| A case with an edit, a runner and a control (`mutations`) | Five cases, `k14-candidate.abl-1` to `-5`, in `tests/fixtures/packet-tools/mutations.json`; one mutant each, the row's one edit to `packages/kernel/src` |
| A declared category and family for every case (`coverage`) | Category `k14-candidate-ablation` and family `k14-candidate` in `coverage.json` |
| A hold-register entry for every case whose run set matches a held or released claim (`corpus`) | Five `unread` entries in `adoption.json` under the released V-ENV claim; the tool recomputes matches `V-ENV` and `re-prototyped-built-in` |
| An attributed witness for a case with such an entry | `claim.kind` is `mechanism_witness`: the tool reports `semantic_credit: none` |

**The runner.** `tests/conformance/k0-candidate/ablation-probe.mjs <ABL-n>` runs the row's schedule through
`kernelCandidate` and the fixture's unmodified runner and prints one observation. A PASS is the control. A FAIL
counts as a kill only if it is the row's: first failure at the row's step, every listed field named, the row's
observed text, no throw. Any other result makes the probe throw, which the registry records as an invalid run.

**One table.** The rows move to `ablation-table.ts`, read by both the maintained test and the probe. A test
checks that each registered mutant is exactly its row's edit and names its rejecting test.

**Why the probe makes a link.** The registry runs each case in a temporary copy of the listed files. The copy
has no workspace install, so `@arrokothi/kernel` resolves nowhere, and the candidate must import the package
root (KC-1, KC-5). With `--link-workspace-kernel` the probe makes the one link `npm ci` makes,
`node_modules/@arrokothi/kernel` to the copy's `packages/kernel`, when it is absent. It then checks, by real
path, that the package root resolves to the copy's own `packages/kernel/src/index.ts`. So the registry's run
reaches the edited Kernel through the candidate's own import, which the maintained test's injected coordinator
does not show. Without the flag the probe creates nothing.

**No invented credit.** The V-ENV detector matches any reference to a built-in such as `Map` or `JSON`, and the
word `__proto__` appears in two comments, so the cases match released claims lexically. Like all 303 existing
cases they are `mechanism_witness` records with `unread` entries. Nobody has read these entries against the
release, so they earn no conformance or correction credit. 017 L-44 now says this.

**Checked before the payload.** The registry's own runner, restricted to these five cases at a local commit:
five controls pass and five mutants are killed, each by its row.

**The latest-grant mutant** stays a maintained witness in `ablations.test.ts`, as the owner asked. It is an
edit to the adapter, and its kill needs ABL-2's Kernel edit at the same time; one test shows it passes the twelve
schedules while presenting a newer grant for an older proposal, and a second shows ABL-2's check rejects it.

## 3. The gate sentence (R02-3, K14C-R01-03)

The sentence in `mental-model/mechanisms/evidence.md` § Attribution and gates becomes:

> A gate's scope is its owner's decision, recorded where the gate is defined. An exclusion from a gate's matrix
> is valid only when it lies within that approved scope and is declared, with its reason, before the capture. A
> subject that lacks the surface for an in-scope obligation is not exempt from it: that obligation is missing
> gate evidence. An excluded schedule the subject refuses stays in the result as a refusal, never as a pass or a
> violation.

The K1 decision stays where it is owned and is not restated in Layer 3. Bounded text check, read against owner
choice 02: 007 (the K1.4-candidate and K1.4-gate sections and rows, the K2.4 acceptance, the K1, K2 and K3
milestone rows and K3.4), `001`, `mental-model/roadmap.md`, the candidate README and 017 L-38. Each states the
twelve-schedule K1 matrix and the three K2 assignments as owner choice 02's decision, and none states a general
rule. Nothing else needed a change.

## 4. Preservation (R02-4)

KC-1 to KC-6 and the dispositions of D01-CHK-01..09 stand as implementation report 01 gave them, with these
changes: D01-CHK-02 and -06 item 3 by §1, D01-CHK-09 by §2, KC-6 by §3. The verdicts stay 12 PASS and 3 REFUSED,
pinned exactly. The fixture's scenarios, runner and oracle are untouched. D01-CHK-04 stays with K2.4/E2.

Validation: the candidate's five test files, the fixture's tests, the architecture and mapping tests, typecheck
and the full suite locally; `corpus` in a fresh clone; then Packet verify in CI at the new C.

## 5. For the reviewer to weigh

1. **Exposure, not a throw** (§1).
2. **The probe writes one link into the registry's temporary copy** (§2). It is the workspace's own link and it
   is checked by real path, but it is a file-system write by a probe.
3. **A new registry category**, `k14-candidate-ablation`, with one family. `k13-semantic` is the precedent.
4. **The row-match rule lives in the probe**, not in `packet_tools.py`: the registry itself sees only passed,
   failed or invalid.
