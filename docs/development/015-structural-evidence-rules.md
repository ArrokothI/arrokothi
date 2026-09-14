# Structural evidence rules

K1.0 put the target Kernel boundary in two places at once: a written inventory a person can read,
and an executable check a test can run. This page owns the rules that keep those two in agreement.

These are verification rules for this repository's own evidence, not Kernel semantics. Architecture
is owned by [the mental model](../../mental-model/README.md); what a structural pass does and does
not prove is owned by [evidence](../../mental-model/mechanisms/evidence.md#structural-evidence).

| Artifact | Role |
|---|---|
| [ownership-inventory.md](work/K1.0/ownership-inventory.md) | The written half: zones, roots, exports, measured dependencies and deferred owners |
| [inventory-oracle.ts](../../tests/conformance/architecture/inventory-oracle.ts) | Reads that document into the relations it asserts |
| [boundary-policy.ts](../../tests/conformance/architecture/boundary-policy.ts) | The executable half: the zones and import rules themselves |
| [kernel-landing-zone.test.ts](../../tests/conformance/architecture/kernel-landing-zone.test.ts) | Asserts the two halves agree, so neither can describe a boundary the other does not enforce |

## Read the document, do not guess at it

The reader discovers the tables that are actually present, validates each against its full expected
schema, and decodes whole cells. Content it cannot recognize fails the check; it is never skipped as
decoration. A row is a body row or a header because of where it sits in the table, never because a
cell happens to read like a column title (K10-R6-01). A section is the span between two real ATX
headings, never a heading-like line inside prose, inline code or a fenced block (K10-R7-01).

Dependency evidence resolves imports the way the language does, and is exercised by controls that
are known to be forbidden and known to be permitted. A check that only ever sees passing input
proves nothing about the failing case.

## Comparing a set is not comparing a string

Some inventory cells hold a **collection-valued relation** — a set of package export subpaths, for
example. Comparing two of those means comparing how many members each has and which members those
are. Order may differ; membership may not.

The failure this rule exists to prevent is comparing the rendered text instead of the members.
One member `"a,b"` and two members `"a"` and `"b"` print identically once joined, so a check that
compares joined text reports agreement between an inventory and a source tree that disagree. A
documented duplicate member is likewise rejected rather than quietly collapsed to one.

Counts, sentinels, publishability flags and scalar path/disposition/owner tuples keep their own
meanings; the set rule applies only where the schema declares a collection. This is a comparison
rule for this document, not a change to the protocol value model — there,
[array order stays semantic](../../mental-model/concepts/values.md#canonical-form).

Recorded in [K1.0-correction-01](work/K1.0-correction-01/contract.md) and
[K1.0-correction-02](work/K1.0-correction-02/contract.md).

## Editing the inventory

The inventory is machine-consumed. Its table schemas are fixed, and changing a measured fact to make
a parser pass inverts the whole point of the check. When the source tree changes, update the measured
fact; when the schema must change, change the reader and the document together and say so in the
packet record. A documentation rewrite may reword prose around these tables, but it may not weaken an
agreement check or relax a schema.

Candidate measurements are taken from the tree under review. Base measurements are taken from the
tree it started from. Reporting one as the other hides exactly the drift this check exists to catch.
