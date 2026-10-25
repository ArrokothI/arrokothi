# Design 02 — TOOLS-02 (delta on design 01)

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-23 (America/New_York).
- **Inputs:**
  - [design 01](design-01.md) (`1aec8b62`);
  - Codex GPT-6 [design check 01](design-check-01.md) (`9ca58fbe`), REDESIGN;
  - [owner choice 01](owner-choice-01.md), which settles D01-CHK-01 by amending T2-1 (option A) and adopts
    `recorded_limit`, L-16 and range 1's early review and integration.
- **Scope:** this note changes only what it names. Everything else in design 01 stands. No code is written before
  design check 02.

| Finding | Disposition | Where |
|---|---|---|
| D01-CHK-01 | Settled by owner choice 01 (amended T2-1). §1 gives the record form that meets the amended sentence | §1 |
| D01-CHK-02 | Directory existence reads follow the listing rule; four new controls | §1.2, §1.4 |
| D01-CHK-03 | The guard sits at the CLI dispatch and inside the census routes; the writer census is a bounded-vocabulary check | §2 |
| D01-CHK-04 | Each witness is bound to the `node:test` invocation that raised it; M-cross-leaf; a defined checked source set | §3 |
| D01-CHK-05 | An `unread` class; an executed per-leaf environment observation; a pre-initialization check; three controls | §4 |
| D01-CHK-06 | The population is frozen at H; the reviewer chooses and records the seed; a re-audit rule; a bound for small populations | §5 |

## 1. T2-1 under the amended criterion

### 1.1 Record form (replaces design 01 §1.2's `reads` row)

The amended T2-1 says that a real change to a named read, or to any fixture read, still changes the member's
record. Enumerated non-fixture reads are recorded by walk root.

Design 01 compared reads only against the pin, path by path, so a second edit of an already-changed read left
the record unchanged. D01-CHK-01 points out that this is an inherited weakness. The record therefore now carries
each read's **identity at C**:

```text
reads = sha256(json({
  named:    sorted (path, kind, identity_at_C)  for every named read,
  fixtures: sorted (path, kind, identity_at_C)  for every enumerated fixture read,
  walks:    sorted walk roots
}))
```

Identity at C is defined per kind:

| Kind | Identity at C |
|---|---|
| `bytes` | the blob ID at C, or `null` |
| `listing` | the sorted entry names at C, or `null` |
| `exists` | present or absent at C |

These are computed from C's tree, which equals the working tree because the census refuses an unclean checkout
(§2).

**Unchanged from design 01:**
- `repository_read_changed` and the fixture refusal reasons stay pin-relative, as P1-P defines them.
- `walks` is still recorded.
- Enumerated non-fixture reads still enter only through their walk root.

**Definitions, as design 01 §1.2 gives them.** A read is *enumerated* when the same run listed one of its proper
ancestors, and its walk root is the outermost such ancestor. Every other read is *named*. Both are classed from
the trace alone, so a path that the test code names, but that lies beneath a directory the run also lists, is
enumerated. That is the owner's option A, stated here so the reviewer can check it. The same holds when an inner
non-fixture listing is removed beneath a walk that remains: the record does not change.

### 1.2 Directory existence reads (D01-CHK-02)

Today `fixture_read(path, 'exists')` treats any extensionless path under `tests` as a fixture. So a scanner's
`statSync('tests/new-suite')` on a new, unrelated test directory raises a fixture difference.

**New rule:**
- An `exists`-kind read of a path that is a directory at C, or at the pin when it is absent at C, follows the
  listing rule. It is a fixture read only when a `fixtures` component follows `tests` in the path.
- Bytes reads, and existence reads of files or of paths absent at both revisions, keep design 05's rule: a
  non-source path under `tests`.

**Fixture-directory listings, declared as D01-CHK-02 asks.** A listing or directory-existence read beneath a
`fixtures` component is a fixture read whether it is named or enumerated. A walker that lists `tests/fixtures/…`
therefore records those entries' identity. Adding a fixture changes that walker's record; adding a test file or a
non-fixture directory changes nothing.

At B this affects the two TypeScript walkers, `ambient-reads` and `control-commits` (21 rows). They list
`tests/fixtures` and its subdirectories, so their records change when an entry is added to or removed from such a
directory.

### 1.3 Status: what changes (replaces design 01 §1.3's self-check)

The identity digest changes no status. §1.2 narrows the fixture rule, so a member whose only fixture reasons were
existence reads of directories outside `fixtures` loses those reasons. If it has no other reason, it becomes
`preserved`.

At B, `ambient-reads` and `control-commits` keep `tests/fixtures` listings as fixture reasons. Their
`tests/tooling` and `tests/tooling/node-floor` existence reasons drop.

**Build self-check:** regenerate at B in both forms, then require:
- `by_status` and every non-read reason are identical, except for members listed as having lost only
  directory-existence fixture reasons;
- each listed member passes P1-P fresh at C;
- the list is reported with its count.

### 1.4 Controls (added to design 01 §1.4)

The synthetic repository has a recursive scanner member. It lists `tests`, calls `statSync` on each directory,
reads only files its source filter selects, and starts with **no fixture reason**.

| Control | Expected |
|---|---|
| Add `tests/existing/unrelated.test.ts` (existing directory) | Record unchanged; `revalidation_complete` |
| Add `tests/new-suite/unrelated.test.ts` (new directory) | Record unchanged; `revalidation_complete` |
| Add `tests/fixtures/new.json`, which the scanner lists | Record changes (fixture listing identity); `invalid` |
| Edit a named read, then edit it again at a later commit | Both edits change the record |
| Edit a named fixture, and an enumerated fixture, twice each | Every edit changes the record |
| Edit an enumerated non-fixture source read | Record unchanged (recorded by walk root) |
| A path the code names, under a listed ancestor | Classed as enumerated; documented behaviour |

The partition variants of design 01 §1.4 stay: everything named, and everything enumerated. So does an
identity-free variant, which the subsequent-edit control kills.

## 2. T2-2: guards at operation boundaries (replaces design 01 §2.2 items 1, 3 and 4, and §2.3)

### 2.1 Routes that produce fixture data

| Route | Output | Guard |
|---|---|---|
| CLI `inventory` | prints origin digests (`source_sha256`) | dispatch |
| CLI `corpus` | census results; table equality | dispatch, and inside `corpus_format_2` |
| CLI `coverage` | coverage report from `coverage.json` | dispatch |
| CLI `mutations`, `cases` | kill results, which registries record | dispatch |
| CLI `regenerate` (new) | writes the derived manifest fields | dispatch, and inside `regenerate` |
| CLI `verify` | composed results | `clean_payload` before and after each step (existing) |
| Direct call of `preserved_census` (the snippet route BINDING-01 and COORD-REFACTOR-01 used) | the table | inside `preserved_census` |
| `tests/tooling/requalify-value-cost.py` | K1.1-correction-03 evidence files | at start, at HEAD |

Two operations are exempt, each with its reason:
- **`candidate`** runs in a review checkout at H over named revisions, and prints identity facts, not fixture data.
- **`gate`** prints an advisory report that no fixture records (owner choice 07).

### 2.2 Mechanism

Every guard has the form `require(pristine(git, rev), '<route>: …')`.
- `pristine` is TOOLS-02A's definition: HEAD is the revision, `git status` is empty, and there are no untracked,
  ignored or git-invisible entries other than `node_modules` and `.DS_Store`.
- Because each guard is its own `require` call, `check-refusal-registry.py` demands a registered ablation for each
  one. Each ablation is killed by its route's refusal test.
- The guard inside `preserved_census` also fixes a latent inconsistency. The census runs tests in the working
  tree, so a call at a revision other than HEAD measured HEAD's files against another revision's blobs. Tool tests
  that call it check out the revision first.

**Writer census.** A check over a declared, bounded vocabulary, not a claim that every writer is caught:
- **Vocabulary:** in Python, `write_text`, `write_bytes`, `open(…)` with a `w`, `a` or `x` mode, and `json.dump`;
  in Node, `writeFileSync`, `appendFileSync`, `createWriteStream` and `fs.promises.writeFile`.
- **Scanned files:** under `scripts/` and `tests/tooling/`, test files excluded.
- **Classification:** each hit file is a `fixture_writer`, which must contain a guarded route, or
  `temporary_only`, with a reason.
- **Stated limit:** shell redirection, subprocess writes, third-party code and stdout piped by a caller are
  outside it. The dispatch guard covers the stdout routes.

### 2.3 Why T2-2 closes

Every row of §2.1 refuses an untracked file, an ignored file and a git-invisible directory, with one test each.
The CLI operations share a single parametrised test over every guarded operation name. The guards are registered
refusal ablations. `regenerate` keeps design 01's narrower write scope.

The criterion's "every operation that writes or recomputes fixture digests" is closed for the operations and
routes in §2.1. The census keeps future files inside the vocabulary classified.

## 3. T2-3: invocation binding (adds to design 01 §3.2–§3.4)

### 3.1 Binding each witness to the `node:test` invocation that raised it

- **Wrapping registrations.** The witness's load hook already parses test-side sources. It also wraps the callback
  argument of each leaf registration it recognizes, under D05-CHK-12's rule: bindings imported from `node:test`
  (`test`, `it` and their `.skip`, `.only` and `.todo` forms), and `<p>.test`, where `<p>` is a registration
  callback's first parameter.
- **The wrapper.**
  - It runs the callback inside an `AsyncLocalStorage` store holding `{file: t.filePath, fullName: t.fullName}`
    from the callback's `TestContext`. Node v26.10.0 provides both fields, verified with a scratch probe. `fullName`
    joins ancestors with `" > "`.
  - It preserves `fn.length`, for `(t, done)` callbacks, and `this`.
  - It does not move the `test(…)` call, so leaf locations are unchanged.
- **Admission.** An assertion is admitted only inside such a store. The witness records
  `{site, invocation: {file, fullName}}`. Hooks and unrecognized registrations have no store, so their assertions
  are never admitted.
- **Lifetime.** An entry credits only the invocation it names. A witnessed error caught in leaf A and rethrown by
  production during leaf B still names A, so B gets no kill.
- **Kill predicate** (amends design 01 §3.2 item 3). The witnessed invocation's file must be the target file. Its
  `fullName` must equal the target's full path, joined with `" > "`. That joined name must be unique among the
  file's leaves in the control run; otherwise the target is refused, since names containing `" > "` could
  otherwise collide.
- **Value-cost route.** It keeps design 03's contract unchanged. The binding lives in the shared witness module
  and is enabled only for target runs.

### 3.2 Checked source set (D01-CHK-04, second part)

`value-cost-source-policy.mjs` scans only `src` directories under `packages`. For target runs, the policy checks
every JavaScript or TypeScript file of the run's copied tree that meets all three conditions:
- it is not test-side, meaning it has no `tests` path segment and no test-file suffix;
- it is not under `node_modules`;
- it is not under `.git`.

The witness uses the same test-side predicate. An empty checked set refuses the run.

The runner builds that tree from declared files, so the set is complete for what the process can load, apart from
pinned dependencies and Node built-ins. Synthetic trees such as `src/value.mjs` are therefore covered. The
value-cost probe keeps its own inventory form.

### 3.3 Controls (added to design 01 §3.3)

| Control | Expected |
|---|---|
| M-cross-leaf: passing leaf A catches an admitted `assert.equal` failure and keeps it; in the mutant, production rethrows it during target leaf B | `observed`, no kill |
| M-duplicate-name: two leaves share the target's joined full name | target refused |
| M-hook: an assertion fails in a `beforeEach` | no kill (not admitted; `hookFailed`) |

M-real and M-forge-frames are kept as the positive control and the forged-constructor refusal. They now run on a
tree without `packages/`, under §3.2's checked set.

## 4. T2-4: classification that matches the released claim (replaces design 01 §4.2's classification rules 1–3)

### 4.1 Classes

| Class | Meaning | Credit |
|---|---|---|
| `held` | The claim is currently held | none |
| `superseded` | As today | none |
| `limit` | The observation shows behaviour outside a released claim; names claim, limit and release record | none |
| `unread` (new) | V-ENV scope undetermined: unread code in the run set, or no observation | none; names no limit |
| `not_held` | The observation shows nothing outside the released claim | through P1-P or P1-T at C only |

### 4.2 The reading of each leaf is an executed observation

D01-CHK-05 requires the required result, the affected component and the initialization timing. The detector
cannot supply them statically; TOOLS-01 rounds 1–4 show why. So the census runs each register file once more,
with an **environment witness** preload, bound to invocations as in §3.1.

- **Snapshot at preload.** Own property descriptors of `globalThis` for every name in `VENV_INTRINSICS`; those
  constructors and their prototypes; design 03's root set; and the iterator prototypes reachable from `Array`,
  `Map`, `Set` and `String` iterators. Also the global resolution of each `VENV_INTRINSICS` name, through a
  precompiled `vm.Script` run in this context, which detects global lexical shadowing.
- **Core-initialization check.** At the start of evaluation of each module in the claims table's `core` set
  (`packages/kernel/src/**`), through the load hook, the current state is compared with the snapshot.
- **Wrapper-entry check.** At each entry into a function exported by the `wrapper` set
  (`packages/sdk/src/internal/value-capture.ts`), the same comparison is made.
- **Each record** holds kind, module, clean or not, and the invocation, or `load` when outside any test. A load
  record applies to every leaf of the file.
- **Child processes.** The preload travels in `NODE_OPTIONS`, as the reads phase's does. A child's records count
  when it loaded the preload.

A V-ENV-matched leaf is classified from its own records:
1. **`unread`** when its invocation was not observed (skipped, or the run failed), when its run set has
   `unresolved` or `parse` detector sites, or when it has `child-process` sites with no child records.
2. **`limit` (V-ENV, L-01, BINDING-01 hold release 01)** when any core-initialization record, at load or in the
   leaf, is unclean. That is intrinsic replacement before the core initializes, which is L-01's host
   precondition.
3. **`limit` (L-01)** when any wrapper-entry record, at load or in the leaf, is unclean.
4. **`not_held`** otherwise, with the observation recorded in the entry (`observation: {wrapper_entries, unclean: 0,
   core_init: clean}`).

The observation is derived data. `regenerate` writes it, and `corpus` recomputes it at C and refuses a mismatch.
A file that reaches the wrapper but whose leaf never enters it is therefore classed by what that leaf did, and an
incidental import decides nothing.

**Registry cases** (87 V-ENV and 12 others) get a per-case reading, recorded in the existing `reading` field.
Their attributions in `mutations.json` (`held_witness`, `mechanism_witness`) follow their new class. **V-D1, Proxy
and re-prototyped entries** keep design 01's per-entry reading. Rules 2–3 take precedence when the entry also
matches V-ENV.

**Declared bound.** The observation sees executed paths and the declared intrinsic surface. Replacing an
unlisted intrinsic, and code paths a run does not take, are not observed. This is a bounded check under 006
working principle 3; §10 Q3 asks whether it also needs a 017 entry.

### 4.3 Checks (amend design 01 §4.2's checks)

- A `held` entry under a released claim is refused, as before.
- A `limit` entry needs a released claim, one of its limits, the claim's release record, and a current 017 ID.
- A V-ENV-matched registration is `not_held` only with a clean observation of its own invocation. Otherwise it is
  `limit` or `unread`.
- `intrinsic_trace` refuses credit at a detector key whose entry is not `not_held` under that rule.
- `unread` members take status `unread`, and their witness records take kind `unread_witness`; `limit` members
  take kind `limit_witness`. The rest of design 01's cascade stands.

### 4.4 Controls

| Control | Expected |
|---|---|
| Core leaf whose file imports a helper that reaches the wrapper; the leaf never enters it | `not_held` |
| Core child-process case whose child loads the preload and enters only the core | `not_held` (resolved child scope) |
| The same case with a child that drops `NODE_OPTIONS` | `unread`, never L-01 |
| A helper replaces `JSON.stringify` at load, before the core module evaluates | `limit` (L-01, pre-initialization) |
| A core-only leaf replaces it after initialization, then calls the core | `not_held` (released core claim) |
| A leaf replaces an intrinsic, then calls the wrapper | `limit` (L-01) |
| A leaf shadows a global through `vm.runInThisContext('let JSON = …')`, then calls the wrapper | `limit` (L-01), detected by name resolution |

Variants that drop the core-initialization check or the wrapper-entry check, or that treat a missing
observation as clean, are each killed by one row.

**Volume** cannot be stated before the observation runs. I report the class counts at the first range-3 commit.
The design 01 §4.1 measurements give the candidate split: 304 core-only and 500 wrapper-reachable.

## 5. T2-5 audit (replaces design 01 §5.5)

**Frozen population.** H's `adoption.json` holds every disposition and rationale. The audit population is every
`triaged` (retired) origin at H's C. Nothing in it changes after H without a new C/H.

**Seed.** The independent reviewer chooses the seed after H is published, and records it, with H's full SHA, in
the review before running the sampler. The algorithm, the sample size and the bound stay declared here, before
any triage:
- `random.Random(seed).sample(sorted(retired IDs at C), n)`;
- n = 150;
- the committed `tests/tooling/triage-sample.py` prints the sample and the population digest.

**Bound.** The bound is a rate: at most ⌊0.02 · n⌋ unsafe errors, with design 01's definition of an unsafe error.
- For n = 150, that is at most 3.
- When fewer than 150 origins are retired, n is all of them and the same rate applies. For example, 100 allows 2,
  and fewer than 50 allows none.
- The Clopper–Pearson figures in design 01 hold only for this frozen, reviewer-seeded sample.

**Relevance samples.** Ten closed and ten extracted origins, with reviewer-chosen seeds recorded the same way.

**Re-audit rule.**
1. A failed audit names the strata of its unsafe errors, where a stratum is class × source packet. The next
   candidate re-triages every origin in those strata, not only the sampled ones.
2. The next audit draws a fresh 150 with a new reviewer-chosen seed. The decision rests on that fresh sample alone.
3. Every origin sampled earlier must also be correct at the new H; a remaining error there fails the audit.
4. After a second failed audit, 006's stop-and-redesign rule applies.

**Self-audit.** It stays, seed 20261026 and n = 50, as an implementer-side stop before H only. It is never
evidence for the bound.

## 6. Range 1's early review (owner choice 01, item 2)

1. **Payload.** Range 1, T2-1 and T2-2, ends at a self-contained C1. Its `verification.json` uses base B and
   expects `adoption` to return `revalidation_complete`. C1 passes the composed verify in a fresh clone and in
   Packet verify CI.
2. **Report.** H1 holds `implementation-01.md` for range 1 only.
3. **Review.** A narrow GPT-6 review of T2-1 and T2-2, the composed verify and regressions. The usual cleanup and
   owner merge follow.
4. **Status.** TOOLS-02 stays IN_PROGRESS: range 1's ACCEPT covers T2-1 and T2-2 at H1 only.
5. **The rest.** Ranges 2–4 continue on `claude/tools-02` after main, holding range 1, is merged in. Their review
   uses the range-1 integration commit as base and reruns range 1's tests.

## 7. Corpus additions

The §1.4, §2.3, §3.3 and §4.4 controls, added to design 01 §8's list.

## 8. Questions for design check 02

1. **§1.1's record form.** Identity at C for named and all fixture reads, with pin-relative labels and reasons
   kept. Does it meet the amended T2-1, including the subsequent-edit case?
2. **§4.2's observation.** Is an executed, per-leaf environment observation an acceptable "reading of each leaf"
   for wrapper-reachable files? Manual readings are kept for registry cases, V-D1, Proxy and re-prototyped entries.
   For the owner: say so if you meant a manual reading of every one of about 520 leaves instead.
3. **§4.2's declared bound.** Does the bound on the observed intrinsic surface need a 017 entry, or does a stated
   bound in the design and report suffice?
4. **§5's re-audit rule and small-population bound.** Acceptable?
5. **Carried from design 01:**
   - **Q4.** Should `regenerate` carry pure line moves of register entries and suite-target declarations?
   - **Q6.** Should I stop and ask when the extracted projection exceeds 60 origins? This is for the owner.
