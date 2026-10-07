# TOOLS-01 — owner decision: safe-position rule for intrinsic contact

Recorded 2026-10-07 by Claude Code (`claude-opus-5-5`), design author of design 05 and author of owner
choices 04, 06, 07 and 08. It answers the two re-reviews of H `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94`:

- [review 03](review-03.md) (GPT-6, soundness): CHANGES REQUIRED. R3-01: an expression wrapper hides
  an intrinsic's escape. R3-02: a callee's name stands in for proof that a call is read-only. It
  invokes stop-and-redesign.
- [review 04](review-04.md) (Claude, fidelity): ACCEPT, with P3 findings TOOLS01-R4-LIST-01 and
  -OVERLAP-01. It left detector soundness to review 03.

The design author analysed both reviews and offered four options. Option A, recommended, flips the
detector from a list of dangerous forms to a list of safe positions, with a pre-agreed exit. The
owner's answer, verbatim:

> A, draft owner choice 10 and the implementer prompt

This text transcribes that answer; the design author wrote it. It binds at the commit that adds it.
No hold, credit or acceptance follows from it; TOOLS-01 remains IN_PROGRESS.

## Cause

Three rounds have each found a new form that reaches ordinary credit past the V-ENV detector:

- review 01: casts and aliases;
- the design 06 check: descriptor results;
- review 03: wrappers and reader names.

The detector lists hazardous uses of an intrinsic value and credits everything else, so every
unlisted form of JavaScript is credit by default. Owner choice 08's principle requires the opposite
default. The design author found no real test in the corpus that uses R3-01's or R3-02's forms today,
so the hole is latent. That is no reason to keep a default that lets the next form through.

## 1. Safe-position rule (option A)

1. **Default.** A member earns ordinary suite or preserved credit only if every reference to an
   intrinsic value in its run set sits in a safe position. Design 06 defines the run set and the
   intrinsic values, including descriptor and other tainted results.
2. **Safe positions** are a finite table in the design note. Each row is justified as read-only, with
   a fresh or primitive result. The table admits at most:
   - an argument or receiver of a call whose callee is a listed built-in read-only function, resolved
     by identity: the global binding is not shadowed in the file and not reassigned anywhere in the
     run set;
   - a member read whose result is itself used only in safe positions.

   The table names each function, for example `Object.keys`, `JSON.stringify` and `Array.isArray`.
   Spellings never count: a local, imported or member function with a built-in's name is not listed.
3. **Everything else is unsafe.** That includes any wrapper, such as parentheses, `as`, `satisfies`
   or `!`; a call to an unlisted function; storage; a return; and any form the analyzer cannot
   classify. An unsafe reference is a rule-1 match, held under V-ENV by owner choice 08 and listed with
   its reason. A new syntactic form can therefore lose credit, but it cannot gain it.
4. **Kept from design 06:** the run-set reading, intrinsic recognition and taint, the
   `entries`/`values` conservatism, child processes as unread code, and the owner choice 08 §2.3
   category decisions.

## 2. Pre-agreed exit

If an independent review or design check of this round finds a reference to an intrinsic value
outside the safe-position table that reaches ordinary credit, the packet does not start another
detector round. Instead, every member whose run set references any intrinsic value at all is held
under V-ENV by owner choice 08, and no table exempts anything. The implementer applies that coarse rule
directly. The next review checks only that rule and the figures it produces. No further owner round is
needed to trigger it.

## 3. Recorded answers and review 04's P3 items

**Answers to design 06's questions, made verbatim.** The owner sent these answers with the design 06
check request, in text the design author drafted. Recorded verbatim here:

> Owner answers to design-06's questions (2026-10-05):
> 1. Keep the entries held under K1.1-correction-03 claims (V-D1, Proxy, re-prototyped built-ins) under
>    those claims. Owner choice 08 §2.1 applies only to entries held under no other claim; choice 08
>    changes no hold's scope.
> 2. Accept match 4: code run in a child process is unread and held under V-ENV by owner choice 08,
>    including the 39 fault leaves and the oracle's 29 negative-control cases. BINDING-01 classifies them.
> 3. "Reopen" means no contract route closes the origin. A held-witness link is P1-H's route; the 18
>    origins stay closed and are listed in the report.

**The report carries review 04's two P3 items:**

- **TOOLS01-R4-OVERLAP-01:** answer 1 above settles the precedence. The next report states how many
  V-ENV-matching entries stay with K1.1-correction-03 (56 at H) and lists them.
- **TOOLS01-R4-LIST-01:** the next report lists the rule-1 entries and the closed origins relinked to
  held witnesses, or cites committed files that list them.

## 4. Route

- **Design note.** The implementer writes design 06 revision 4, at most one page. It gives the
  safe-position table with each row's justification, the identity rule, the unsafe reasons, and
  the producers and consumers to recheck. It also states the measured effect against
  713/183/74/302, 383 targets, 110 closed origins and 188 rule-1 entries. It answers review 03's
  root-cause questions.
- **Design check.** A GPT-6 session with shell access checks that revision. It checks only:
  - the table's justifications and the identity rule;
  - the cross-product of review 03's wrappers (parentheses, `as`, `satisfies`, `!`) with the escape
    positions (argument, receiver, storage, return, alias), plus same-named local, imported and
    member functions;
  - the measured figures.
- **Build.** The implementer builds after that check approves. Choice 08's stop condition still
  applies: stop if any of the 110 closed origins loses every closing route.
- **Next review.** It exercises the same cross-product at the built C. A credited miss there triggers
  §2's exit.

## Contract diff (revision 9 to 10)

The implementer applies this diff to [contract.md](contract.md).

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 9
+# TOOLS-01 contract — revision 10

@@ -19,3 +19,4 @@ by record, transfers its per-test classification to BINDING-01, and sets this ro
 [Owner choice 09](owner-choice-09.md) withholds kills from the target-set route in TOOLS-01 and moves
-the design of its qualifying-assertion evidence to TOOLS-02.
+the design of its qualifying-assertion evidence to TOOLS-02. [Owner choice 10](owner-choice-10.md)
+credits a member only when every intrinsic reference in its run set sits in a listed safe position.

@@ -46,3 +47,3 @@ made only for that scope.
 | P1-P | A historical test member closes as `preserved` when, at C: its command selects its file and runs each file in its own process; its title, or for a generated title its declaration site, yields at least one leaf and only passing leaves; every test-side module its file imports, transitively, is byte-identical, or for a literal title a counted helper review covers each changed module, top-level code included; its file's traced run reads no changed test fixture; and its whole file is byte-identical, or its own span is and every difference in its prefix is an inert declaration that nothing live in the prefix references. The prefix is the file's load-time code (everything outside test and hook callbacks), earlier tests in source order, and the hooks that run before or around the member. | Deterministic identity, prefix, read, selection, catalog and closure checks, fresh at every C; design 05 defines the prefix, inert declarations, references and fixtures. Preservation claims the same test-side code, fixtures and assertion, not discrimination. Imported production modules and other repository data the run reads that changed since the pin are listed and counted separately; reads the trace cannot observe are a stated limit. Passes through P1-H. |
-| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. Its title, body and file recipes match registration spans and the same-file and test-side helpers they call; they may widen, never narrow below design 05's minimum. Every `held` or `superseded` entry names its reading or its governing owner decision; V-ENV recipe matches are held by owner choice 08, and their per-test classification is BINDING-01's. | Structural destination checks; register recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason; the register refuses a `held` or `superseded` entry that names neither a reading nor an owner decision. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
+| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. Its title, body and file recipes match registration spans and the same-file and test-side helpers they call; they may widen, never narrow below design 05's minimum. Every `held` or `superseded` entry names its reading or its governing owner decision; V-ENV recipe matches are held by owner choice 08, and their per-test classification is BINDING-01's. Under owner choice 10, ordinary credit needs every intrinsic reference in the member's run set to sit in a position from a finite, justified safe-position table, with built-in callees resolved by identity; any other reference is a rule-1 match. | Structural destination checks; register recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason; the register refuses a `held` or `superseded` entry that names neither a reading nor an owner decision; a member with an intrinsic reference outside the safe-position table earns no ordinary credit. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
 | P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, an equivalence argument, or a non-equivalent survivor recorded as a finding for its owner or as an owner-recorded limit; otherwise it stays pending. | Census equality with the member list, with the runner's own count assertions and with any complete sealed run output; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures, equivalence arguments, survivor records and invalid runs never count as kills. |
```

## What it does not decide

- Any change to holds, the split, the 44 transferred origins, P1-T, or owner choice 09's target route.
- BINDING-01's per-test classification.
- Acceptance, or the release of any successor.
