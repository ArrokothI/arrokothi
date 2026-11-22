/**
 * K1.4-candidate: the seven mechanism mutants of the identity rule, as data
 * (design 03 addendum 01 §A4; design check 03 D03-CHK-04).
 *
 * Each row edits `kernel-candidate.ts` so that one part of the mechanism is missing, and names the
 * witness in `identity-witnesses.ts` that must then fail. The row is 012's registry record: site,
 * obligation and the test that rejects it.
 *
 * Two runners read this one table, so they cannot drift apart:
 * - `identity.test.ts`, which applies each edit to a copy and requires the witness to fail by a named
 *   assertion;
 * - `identity-probe.mjs`, which the mutation registry runs for the cases `k14-candidate.identity-m1` to
 *   `-m7` in `tests/fixtures/packet-tools/mutations.json`. `identity.test.ts` checks that each registered
 *   mutant is exactly its row's edits.
 *
 * This file is test-side data. It imports nothing, and the candidate does not import it.
 */

export interface MechanismEdit {
  /** Text that must occur exactly once in `kernel-candidate.ts`. */
  readonly anchor: string;
  readonly edit: string;
}

export interface MechanismMutant {
  /** Also the key of its witness in `WITNESSES`. */
  readonly id: string;
  /** The part of the mechanism the edits remove. */
  readonly obligation: string;
  readonly edits: readonly MechanismEdit[];
  /** A fragment of a failed assertion the witness must report under the edit. */
  readonly rejects: RegExp;
}

export const MUTANT_FILE = "tests/conformance/k0-candidate/kernel-candidate.ts";

export const MUTANTS: readonly MechanismMutant[] = [
  {
    id: "M1",
    obligation: "design 03 §3: a fresh string is recorded in the ledger like any other string",
    edits: [{ anchor: "    this.#denotes.set(text, id);\n    return text;", edit: "    if (!fresh) this.#denotes.set(text, id);\n    return text;" }],
    rejects: /three timeouts, three strings|a reference by the fresh Execution string/,
  },
  {
    id: "M2",
    obligation: "design 03 §3: a fresh string is the first variant the ledger does not hold",
    edits: [{ anchor: "for (let variant = 2; this.#denotes.has(text); variant += 1)", edit: "for (let variant = 2; false; variant += 1)" }],
    rejects: /every Event string is distinct|the fresh string is the first free variant/,
  },
  {
    id: "M3",
    obligation: "design 03 §4 rule 1: the Q2 b label is written through the ledger",
    edits: [
      { anchor: "  /** The ID a string denotes: the inverse of what Observations show. */", edit: "  unchecked(id: string, text: string): string {\n    this.#shown.set(id, text);\n    return text;\n  }\n\n  /** The ID a string denotes: the inverse of what Observations show. */" },
      { anchor: "        eventLedger.assign(wait.timeoutEventId, label);", edit: "        if (label === null) eventLedger.assign(wait.timeoutEventId, null);\n        else eventLedger.unchecked(wait.timeoutEventId, label);" },
    ],
    rejects: /the label and the input are two strings|the label names one Event only/,
  },
  {
    id: "M4",
    obligation: "design 03 §4 rule 1: an input Event's string comes from the Event ledger, not from its payload",
    edits: [
      {
        anchor: "      const text = ledger.assign(entry.eventId, null);",
        edit: '      const text = entry.sourceCategory === "application_input" ? String(carriedName(entry)) : ledger.assign(entry.eventId, null);',
      },
    ],
    rejects: /two request keys, two strings|then an input under its name|then a timeout under its name/,
  },
  {
    id: "M5",
    obligation: "design 03 §4 rule 6: a reference resolves through the inverse of what Observations show",
    edits: [{ anchor: "    return this.#denotes.get(text) ?? null;", edit: "    const id = this.#denotes.get(text);\n    return id !== undefined && this.#tookOffer.has(id) ? id : null;" }],
    rejects: /a fire by the fresh string|the schedule continues on the fresh string/,
  },
  {
    id: "M6",
    obligation: "owner choice 04 OQ-1: a string an Observation has shown never changes",
    edits: [{ anchor: "    if (already !== undefined) return already;", edit: "    if (already !== undefined && (preferred === null || this.#denotes.has(preferred))) return already;" }],
    rejects: /the label stays/,
  },
  {
    id: "M7",
    obligation: "design 03 addendum 01 §A1 rule 4: a Kernel answer is checked against the inspection made after it",
    edits: [{ anchor: "    for (const claim of claims) claim(view);", edit: "    for (const claim of claims) void claim;" }],
    rejects: /a duplicate fire answered with an ID the mailbox does not hold|answered with the first's timeout/,
  },
];
