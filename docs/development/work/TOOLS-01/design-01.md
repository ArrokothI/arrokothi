# Design 01 — TOOLS-01 foundation

## Mechanism

Use one standard-library Python CLI, `scripts/packet_tools.py`, with three operations:

- `candidate`: resolve full commits, load the declared specification from payload C, and inspect
  immutable Git blobs/diffs for ancestry, administrative files, preserved history and evidence.
- `inventory`: read a pinned catalog specification, verify each source/fence/locator, and return
  stable origin IDs, current mapping status and unresolved counts. Existing filename-based
  dispositions remain recommendations; all unadopted origins remain pending.
- `mutations`: load a small explicit registry from a named commit, materialize its declared files
  into a fresh temporary directory per control/mutant, and run an argv command without a shell.
  Each source mutation must match exactly once. The fixture emits one structured observation with
  a stable case, assertion, reach witness and pass flag. A kill requires a passing baseline, an
  applied mutation, reached code and failure of that assertion with the declared failure exit.

Use fresh child process groups with a timeout and output cap. Copy only regular Git blobs named
in the registry; reject traversal, symlinks and duplicate paths. No checkout, reset, worktree,
dependency installation or mutation of the user's files. Registry commands are trusted reviewed
repository code, not a security sandbox for hostile programs. This POSIX runner provides process
cleanup and isolation of ordinary fixtures, not filesystem/network containment.

The initial real fixture checks injective identity packing through production `identity.ts`,
using distinct literal part lists. The mutant removes length prefixes. This establishes the
runner mechanism without selecting any pending serializer/realm/Proxy design. Importing the
existing production module is exercising project code, not copying third-party code.

## Why each criterion closes

F1 has finite immutable input identities and exact set/digest comparisons. Tests alter one fact
at a time. It does not infer authenticity of owner/reviewer messages or classify arbitrary prose
as administrative.
F2 replays the finite pinned catalogs, checks each source's exact bytes/line, and emits one stable
ID per origin. Prose references and artifacts have different counts. Extraction remains pending.
F3's finite taxonomy is tested through real subprocess fixtures and controlled source mutations;
its independent assertion comes from the fixture, not the mutated implementation.
F4's temporary trees are discarded on every exit; child process groups are terminated on timeout
or output overflow. Tests verify original bytes and exercise both termination paths.
F5 counts pending work explicitly and labels outputs by operation. The tool cannot write an
accepted ledger state. F6 closes through the report, scoped diff and external handover.
P1/P2 are deliberately still open; this foundation supplies their mechanism, not their verdict.

## Accepted designs relied on

006's C/H separation and independent acceptance remain appropriate. The audit catalog is useful
provenance but cannot decide semantic equivalence from filenames or hashes. The full-decision
fault oracle is useful but carries phase-specific exceptions; do not generalize it into arbitrary
fault atomicity. The old one-off mutation runners remain sealed and will be migrated deliberately.

## Corpus

The initial registry owns one injective-packing case/mutant. Python tooling tests cover verifier,
inventory and runner defects. The pinned inventory retains every other source with pending
adoption. No hostile test, held finding or analyzer is retired. Review-03 additions are indexed.

## Questions

No unresolved semantic question blocks F1–F6. Later design must choose the corpus extraction and
current-suite adapters, oracle migration and per-packet orchestration with Claude's research
available. New dependencies, policy amendments or weakened claims need the owner; this foundation
chooses none. This is the implementer's design rationale, not independent design acceptance.
