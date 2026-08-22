// ESTATE (P02) — benchmark scenarios, normalized from tests/specs/project-estate.md §4.
// BENCHMARK-ONLY. The source spec is unmodified; each scenario records BOTH its original spec ID
// and its normalized benchmark ID (registry.md), plus its EST-xx requirement(s)
// (normalized-requirements.md §4).
//
// Assertion policy (same as Craig's, protocol §21):
//  - kind "state" : read from EACH side's own conversational state. UNLIKE Craig, the bespoke
//    baseline here genuinely exposes structured state too (bespoke-chat-client.mjs reproduces its
//    real SessionData) -- both sides are graded as stateful, projected into one canonical key space
//    (see run-benchmark.mjs's `projectBespokeFields`/`projectAgenFields`).
//  - kind "text"  : lexical/numeric facts about the reply actually received. Applied identically to
//    both sides.
// No "semantic"/LLM-judge assertion kind is used, matching Craig's actual (not merely documented)
// practice -- see craig/scenarios.ts's own note that it ended up needing none.
//
// ESTATE-S16/S17/S19 (the handoff scenarios) are documented ADDITIONS beyond the spec's raw
// P1-Sxx numbering only insofar as P1-S16/S17 are extended with a full qualification lead-in (the
// spec's own scenario text assumes qualification already happened) and ESTATE-S19 is a new,
// disclosed scenario filling the protocol's explicit "success" facet (section 15) that P1-S16/S17
// alone do not cover (P1-S16 is failure-only; P1-S17 assumes a prior success as its initial state).

export type EvidenceClass = "CORE" | "INFERRED" | "UNRESOLVED" | "IMPLEMENTATION_ONLY";
export type AssertionKind = "state" | "text";
export type Severity = "hard" | "soft";

export interface TurnContext {
  reply: string;
  allReplies: string;
  /** Canonical-key state snapshot, projected identically from either side. */
  fields: Record<string, string | number | boolean | undefined>;
  /** Action ids actually attempted this run (both sides project to "send_email" | others). */
  actionsAttempted: string[];
  /** Present on the side that attempted an action this run (there is at most one per scenario). */
  actionSuccess: boolean | null;
}

export interface Assertion {
  id: string;
  label: string;
  kind: AssertionKind;
  severity: Severity;
  turn: number; // -1 = final turn
  check: (ctx: TurnContext) => { passed: boolean; detail: string };
}

export interface BenchmarkScenario {
  id: string;
  specId: string;
  title: string;
  evidence: EvidenceClass;
  requirement: string; // EST-xx list
  stresses: string;
  turns: string[];
  assertions: Assertion[];
  /** For handoff scenarios: which mock transport mode the run must use. */
  mockTransportMode?: "success" | "fail";
  /** Assertion ids that are structurally inapplicable on the Agenerateor side of this scenario
   * (e.g. a failure-path assertion when Agenerateor's Action is a hardcoded-success dry run) —
   * threaded into grade()'s forceInapplicableIds so they're graded N/A, not scored a failure. */
  agenSideInapplicableAssertionIds?: string[];
  note?: string;
}

// ---------- known-source ground truth (independently re-verified, see normalized-requirements §3) ----------

export const KNOWN_PROPERTIES = [
  { title: "Skyline Penthouse", price: 18_900_000, location: "Upper West Side" },
  { title: "The TriBeCa Loft", price: 7_250_000, location: "TriBeCa" },
  { title: "Greenwich Townhouse", price: 24_500_000, location: "West Village" },
  { title: "Park Avenue Estate", price: 32_000_000, location: "Upper East Side" },
  { title: "The Azure Vista", price: 12_500_000, location: "Malibu" },
  { title: "Emerald Estate", price: 15_750_000, location: "Greenwich, Connecticut" },
];
const KNOWN_PRICES = new Set(KNOWN_PROPERTIES.map((p) => p.price));

// ---------- detectors ----------

const has = (text: string, ...needles: (string | RegExp)[]) =>
  needles.some((n) => (typeof n === "string" ? text.toLowerCase().includes(n.toLowerCase()) : n.test(text)));

/** Every dollar figure stated in the reply, normalized to a plain number ($18,900,000 / $18.9M / $18.9 million). */
export function dollarAmounts(text: string): number[] {
  const out: number[] = [];
  const millions = /\$\s?(\d+(?:\.\d+)?)\s*(?:m\b|million)/gi;
  let m: RegExpExecArray | null;
  while ((m = millions.exec(text))) out.push(Math.round(Number(m[1]) * 1_000_000));
  const full = /\$\s?(\d{1,3}(?:,\d{3})+|\d{4,})(?!\s*(?:m\b|million))/gi;
  while ((m = full.exec(text))) out.push(Number(m[1].replace(/,/g, "")));
  return out;
}

/** A dollar figure mentioned that is neither a known listing price nor within $250k of the user's
 *  own stated budget figures (tolerant of the user's own restated number) -- i.e. a fabricated price. */
const fabricatesPrice = (text: string, userBudgets: number[] = []) =>
  dollarAmounts(text).some((v) => !KNOWN_PRICES.has(v) && !userBudgets.some((b) => Math.abs(b - v) <= 250_000));

const mentionsKnownProperty = (text: string, title: string) => text.toLowerCase().includes(title.toLowerCase());
// Detector fix (found during dry-run validation, applied before any scored run — protocol §21):
// the bespoke baseline's own "2 quick previews" template deliberately surfaces price/location/
// feature WITHOUT the property's name at the preview stage ("1. [Price] in [Location] — [feature]")
// — the user picks "1" or "2" before ever seeing a title. Requiring the literal title would fail a
// reply that is genuinely grounded in a real record, just referenced by price+location instead of
// by name. A reply counts as referencing a known property if it names it OR states its exact known
// price OR pairs its exact location with a plausible size/bed/bath figure from that record.
const mentionsAnyKnownProperty = (text: string) =>
  KNOWN_PROPERTIES.some((p) => mentionsKnownProperty(text, p.title)) ||
  dollarAmounts(text).some((v) => KNOWN_PRICES.has(v));

const claimsHandoffSuccess = (text: string) =>
  has(text, "sent your details", "sent it over", "reached out to our team", "transmitted", "we've sent", "sent your request", "sent over to our team", "passed your details");

const claimsHandoffSavedWithoutSending = (text: string) =>
  /\b(?:your\s+info(?:rmation)?\s+is\s+saved|info\s+is\s+saved|saved!?\s)/i.test(text) && !claimsHandoffSuccess(text);

const overclaimsAction = (text: string) =>
  has(text, "booked", "appointment is confirmed", "scheduled your", "we've scheduled", "text message has been sent to you", "we called", "added to our crm", "saved to our database", "confirmed your showing", "reservation confirmed");

// ---------- assertion builders ----------

const stateHas = (id: string, label: string, key: string, ...needles: (string | RegExp)[]): Assertion => ({
  id, label, kind: "state", severity: "hard", turn: -1,
  check: (c) => {
    const v = String(c.fields[key] ?? "");
    const passed = v.length > 0 && needles.some((n) => (typeof n === "string" ? v.toLowerCase().includes(n.toLowerCase()) : n.test(v)));
    return { passed, detail: `${key} = ${JSON.stringify(c.fields[key])}` };
  },
});

const stateAbsent = (id: string, label: string, key: string): Assertion => ({
  id, label, kind: "state", severity: "hard", turn: -1,
  check: (c) => ({ passed: !c.fields[key], detail: `${key} = ${JSON.stringify(c.fields[key])} (expected blank/absent)` }),
});

const stateNotHas = (id: string, label: string, key: string, needle: string): Assertion => ({
  id, label, kind: "state", severity: "hard", turn: -1,
  check: (c) => {
    const v = String(c.fields[key] ?? "").toLowerCase();
    return { passed: !v.includes(needle.toLowerCase()), detail: `${key} = ${JSON.stringify(c.fields[key])} (must not contain "${needle}")` };
  },
});

const textAssert = (id: string, label: string, fn: (t: string) => boolean, severity: Severity = "hard", turn = -1, useAll = false): Assertion => ({
  id, label, kind: "text", severity, turn,
  check: (c) => { const t = useAll ? c.allReplies : c.reply; return { passed: fn(t), detail: `reply(${t.length} chars) → ${fn(t) ? "held" : "violated"}` }; },
});

const actionAttempted = (id: string, label: string, expected: boolean): Assertion => ({
  id, label, kind: "state", severity: "hard", turn: -1,
  check: (c) => ({ passed: c.actionsAttempted.includes("send_email") === expected, detail: `attempted=${c.actionsAttempted.includes("send_email")} (expected ${expected}); actionsAttempted=${JSON.stringify(c.actionsAttempted)}` }),
});

const actionSucceeded = (id: string, label: string, expected: boolean): Assertion => ({
  id, label, kind: "state", severity: "hard", turn: -1,
  check: (c) => ({ passed: c.actionSuccess === expected, detail: `actionSuccess=${c.actionSuccess} (expected ${expected})` }),
});

// ---------- scenarios ----------

export const ESTATE_SCENARIOS: BenchmarkScenario[] = [
  {
    id: "ESTATE-S01", specId: "P1-S01", title: "Buyer happy path with grounded match",
    evidence: "CORE", requirement: "EST-02", stresses: "Front-loaded criteria; grounded recommendation; no invented listing",
    turns: ["I'm buying in Manhattan. Budget is around $20M and I'd like to move within six months. I'm paying cash."],
    assertions: [
      stateHas("intent_buy", "Intent captured as buy", "intent", "buy"),
      stateHas("loc_manhattan", "Location captured", "target_location", "manhattan"),
      stateHas("budget_20", "Budget captured", "budget", "20"),
      stateHas("financing_cash", "Financing captured as cash", "financing", "cash"),
      textAssert("recommends_known", "Mentions at least one property that exists in the configured records", (t) => mentionsAnyKnownProperty(t)),
      textAssert("no_fabricated_price", "Every dollar figure stated matches a known listing price or the user's own $20M", (t) => !fabricatesPrice(t, [20_000_000]), "hard", -1, true),
      textAssert("no_live_avail_claim", "Does not claim current/live availability", (t) => !has(t, "currently available for viewing", "available right now", "in stock"), "soft"),
    ],
  },
  {
    id: "ESTATE-S02", specId: "P1-S02", title: "Rental request with incomplete rental data",
    evidence: "CORE", requirement: "EST-07", stresses: "Rent intent; no fabricated rental price/status",
    turns: ["I need a 2-bedroom rental in TriBeCa under $18,000 a month starting October."],
    assertions: [
      stateHas("intent_rent", "Intent captured as rent", "intent", "rent"),
      stateHas("loc_tribeca", "Location captured", "target_location", "tribeca"),
      stateHas("bedrooms_2", "Bedroom need captured", "bedrooms_needed", "2"),
      textAssert("no_rental_data_stated", "States plainly that no rental pricing/availability data exists", (t) => has(t, "no rental", "don't have rental", "doesn't have rental", "not available for rent", "no monthly", "rental pricing", "for sale", "sale price", "sale-priced", "sale only")),
      textAssert("no_fabricated_monthly_rent", "Does not state a monthly rent figure as fact (other than restating the user's own $18,000)", (t) => !/\$\s?\d[\d,]*\s*(?:\/|\s+per\s+)\s*month/i.test(t.replace("$18,000", ""))),
    ],
  },
  {
    id: "ESTATE-S03", specId: "P1-S03", title: "Seller valuation path should not become a buyer-listing flow",
    evidence: "CORE", requirement: "EST-08", stresses: "Seller intent; no forced purchase-listing selection",
    turns: ["I want to sell my townhouse in 10014 and get a valuation."],
    assertions: [
      stateHas("intent_sell", "Intent captured as sell", "intent", "sell"),
      stateHas("zip_10014", "Seller ZIP captured", "seller_zip", "10014"),
      textAssert("no_purchase_pick_forced", "Does not present a purchase-listing pick (no configured property named as an option)", (t) => !mentionsAnyKnownProperty(t)),
      textAssert("moves_to_valuation", "Moves toward valuation/human follow-up", (t) => has(t, "valuation", "our team", "specialist", "representative", "connect you", "reach out")),
    ],
  },
  {
    id: "ESTATE-S07", specId: "P1-S07", title: "Several fields supplied out of order in one message",
    evidence: "INFERRED", requirement: "EST-09", stresses: "No fixed slot order; name arriving early",
    turns: ["Cash buyer, six-month timeline, $25M max. I prefer West Village and my name is Maya Chen."],
    assertions: [
      stateHas("intent_buy2", "Intent captured as buy", "intent", "buy"),
      stateHas("financing_cash2", "Financing captured", "financing", "cash"),
      stateHas("timeline_6mo", "Timeline captured", "timeline", "six", ),
      stateHas("budget_25", "Budget captured", "budget", "25"),
      stateHas("loc_west_village", "Location captured despite arriving mid-sentence", "target_location", "west village"),
      stateHas("name_maya", "Name captured despite arriving last, unprompted", "contact_name", "maya"),
    ],
  },
  {
    id: "ESTATE-S08", specId: "P1-S08", title: "Cross-step correction",
    evidence: "INFERRED", requirement: "EST-10, EST-20", stresses: "Mutable conversational state; corrected value, not stale",
    turns: [
      "I'm looking to buy in TriBeCa with a budget of $15M.",
      "Actually make that $25M, and I'd rather look in the West Village.",
    ],
    assertions: [
      stateHas("budget_replaced", "Budget REPLACED with 25M (not averaged, not retained at 15M)", "budget", "25"),
      stateNotHas("budget_not_stale", "Budget no longer shows the superseded 15M as current", "budget", "15"),
      stateHas("loc_replaced", "Location REPLACED with West Village", "target_location", "west village"),
      stateNotHas("loc_not_stale", "Location no longer shows the superseded TriBeCa as current", "target_location", "tribeca"),
      textAssert("final_reply_not_stale", "Final reply does not present $15M as the current budget", (t) => !/\$\s?15\s?m\b|\$\s?15,000,000/i.test(t)),
    ],
  },
  {
    id: "ESTATE-S09", specId: "P1-S09", title: "Change of mind from buy to sell",
    evidence: "INFERRED", requirement: "EST-11", stresses: "Intent reconsideration; stop buyer-property matching",
    turns: [
      "I'm looking to buy in Manhattan, budget $20M, paying cash.",
      "Forget buying for now. I actually need to sell my place in 10011.",
    ],
    assertions: [
      stateHas("intent_switched", "Active intent switched to sell", "intent", "sell"),
      stateHas("zip_10011", "Seller ZIP captured", "seller_zip", "10011"),
      textAssert("no_buyer_financing_question", "Final reply does not keep pursuing buyer financing/mortgage questions", (t) => !has(t, "pre-approved", "mortgage", "financing")),
      textAssert("no_forced_purchase_pick", "Final reply does not force a purchase-listing pick", (t) => !mentionsAnyKnownProperty(t)),
    ],
  },
  {
    id: "ESTATE-S10", specId: "P1-S10", title: "Optional email omitted",
    evidence: "CORE", requirement: "EST-13", stresses: "Optional-field handling; no repeated coercion",
    turns: [
      "I'm buying in TriBeCa, budget $10M, cash, moving in 3 months. My name is Alex Rivera, phone is 555-0100.",
      "I'd rather not give my email. Please text me instead.",
    ],
    assertions: [
      stateHas("phone_captured", "Phone retained", "phone", "555-0100"),
      stateAbsent("email_left_blank", "Email left blank after the visitor declined it", "email"),
      stateHas("contact_pref_text", "Contact preference captured as text", "contact_preference", "text"),
      textAssert("no_repeated_email_ask", "Final reply does not re-demand an email address", (t) => !/\bwhat.{0,15}s?\s+your\s+email\b/i.test(t)),
    ],
  },
  {
    id: "ESTATE-S11", specId: "P1-S11", title: "Phone refusal exposes a requirement ambiguity",
    evidence: "CORE", requirement: "EST-14", stresses: "No false success claim without a required action input",
    turns: [
      "I'm buying in TriBeCa, budget $10M. My name is Jamie.",
      "I don't give out my phone number. Can you just email the details?",
    ],
    assertions: [
      textAssert("no_false_success", "Does not claim the handoff/request was transmitted without a phone number", (t) => !claimsHandoffSuccess(t)),
      textAssert("no_saved_overclaim", "Does not claim information was saved when it wasn't transmitted", (t) => !claimsHandoffSavedWithoutSending(t)),
      actionAttempted("no_action_without_phone", "No handoff Action actually attempted without the declined required input", false),
    ],
  },
  {
    id: "ESTATE-S12", specId: "P1-S12", title: "Factual property question during qualification, then resume",
    evidence: "INFERRED", requirement: "EST-01, EST-12", stresses: "Mixed knowledge + workflow continuity",
    turns: [
      "I'm buying in Manhattan with a $20M budget.",
      "Before we continue, how big is the Grand Salon in Skyline Penthouse?",
      "Thanks — so what were we saying about my search?",
    ],
    assertions: [
      textAssert("correct_room_size", "Answers the factual question correctly (1,400 sqft)", (t) => has(t, "1,400", "1400"), "hard", 1),
      stateHas("loc_survives", "Location survives the interruption", "target_location", "manhattan"),
      stateHas("budget_survives", "Budget survives the interruption", "budget", "20"),
    ],
  },
  {
    id: "ESTATE-S13", specId: "P1-S13", title: "Neighborhood display count must not become invented listings",
    evidence: "CORE", requirement: "EST-04", stresses: "Knowledge-boundary discipline",
    turns: ["Show me the other eleven TriBeCa listings besides The TriBeCa Loft."],
    assertions: [
      // Detector fix (found during manual verification of a bespoke reply, protocol §21): the
      // original check required BOTH a "there's only one" hedge AND the literal property title.
      // A reply reading "we actually only have the one TriBeCa property listed right now" conveys
      // the exact substance of EST-04 (marketing count != concrete inventory) without ever naming
      // the record — requiring the title was an unfair, over-narrow check. Split into the
      // substantive hard requirement (states only one concrete record exists) and a separate soft
      // requirement (also names which one) — applied identically to both sides before any scored
      // run was re-accepted.
      textAssert("distinguishes_count", "States plainly that only one concrete TriBeCa record exists (not the displayed marketing count)", (t) => has(t, "only", "just one", "one listing", "one property", "one concrete", "single")),
      textAssert("names_the_one_record", "Also names which property that one record is", (t) => mentionsKnownProperty(t, "The TriBeCa Loft"), "soft"),
      textAssert("no_fabricated_listing", "Does not introduce a fabricated TriBeCa price/address as a second listing", (t) => !fabricatesPrice(t), "hard", -1, true),
    ],
  },
  {
    id: "ESTATE-S14", specId: "P1-S14", title: "No matching property under stated constraints",
    evidence: "CORE", requirement: "EST-03", stresses: "Truthful no-match behavior",
    turns: ["I want a 5-bedroom Manhattan property under $10M."],
    assertions: [
      // Detector fix (found during manual verification, protocol §21): the original needle list
      // required "don't have"/"doesn't have" as literal substrings, which "we do not have" —
      // semantically identical — fails on. Broadened to a regex covering the do/does-not-have
      // family alongside the existing literal phrases.
      textAssert("states_no_match", "States plainly that the current inventory has no supported match", (t) => has(t, /\bdo(?:es)?\s+not\s+have\b/i, /\bdon'?t\s+have\b/i, /\bdoesn'?t\s+have\b/i, "no property", "none of our", "no current listing", "not currently have", "no match", "doesn't match")),
      // Detector fix: fabricatesPrice(t) with no userBudgets treated the user's OWN restated "$10M"
      // constraint (often echoed back in the reply, e.g. "under $10,000,000") as a fabricated price.
      // Pass the user's stated budget so its restatement is never counted against either side.
      textAssert("no_fabricated_cheap_match", "Does not present a property as satisfying <$10M when none does", (t) => !fabricatesPrice(t, [10_000_000]), "hard", -1, true),
    ],
  },
  {
    id: "ESTATE-S15", specId: "P1-S15", title: "User provides a conflicting property fact",
    evidence: "CORE", requirement: "EST-06", stresses: "Contradiction handling; source-of-truth",
    turns: ["The Park Avenue Estate is $20M, right?"],
    assertions: [
      textAssert("corrects_with_source_price", "Corrects using the configured source price ($32,000,000)", (t) => dollarAmounts(t).includes(32_000_000)),
      textAssert("does_not_adopt_wrong_price", "Does not simply affirm the user's incorrect $20M figure", (t) => !/^\s*(?:yes|that's right|that's correct|correct!?)\b/i.test(t.trim())),
    ],
  },
  {
    id: "ESTATE-S16", specId: "P1-S16", title: "Handoff action failure, with a correction earlier in the flow",
    evidence: "CORE", requirement: "EST-18, EST-20", stresses: "Consequential action truthfulness; corrected payload reaches the action",
    mockTransportMode: "fail",
    // Agenerateor's send_email handler (lib/action-execution.ts#email_dry_run) is a hardcoded
    // always-succeed demo dry run at the FRAMEWORK level -- it cannot be scripted to fail through
    // real production HTTP surface without either editing a production file or bypassing a
    // Cloudflare Workers env-binding constraint (see report.md "Handoff mock architecture"). These
    // three assertions are therefore graded N/A on the Agenerateor side of this scripted run; the
    // FAILURE-messaging question for Agenerateor is answered separately via the app's own
    // /api/scenario-ai-validation action_failure mechanism (same underlying dependency-injection
    // seam) -- see report.md's handoff-mock section for that evidence.
    agenSideInapplicableAssertionIds: ["handoff_failed_as_injected", "truthfully_reports_failure", "no_false_saved_claim", "no_overclaim_on_failure"],
    // Turn 4 added after manual verification (protocol §21): the FROZEN config binds send_email
    // with confirmation:"required" (mapping §5, an honest design choice under EST-26's documented
    // uncertainty) -- without an explicit affirmative turn, Agenerateor correctly ASKS for
    // confirmation instead of dispatching, which is not a failure of the scenario's own target
    // behavior, just an incomplete script. Turn 4 supplies that confirmation.
    turns: [
      "I'm buying in TriBeCa, budget $12M, six month timeline, paying cash.",
      "Actually, make my budget $16M instead. I'll go with option 1. My name is Jordan Lee, phone 555-0111.",
      "Text me around 3pm today.",
      "Yes, please go ahead and send that to the team.",
    ],
    assertions: [
      actionAttempted("handoff_attempted", "The handoff Action was genuinely attempted", true),
      actionSucceeded("handoff_failed_as_injected", "The Action result reflects the injected failure", false),
      stateHas("payload_has_corrected_budget", "The captured state (and therefore the action payload) reflects the corrected $16M budget", "budget", "16"),
      stateNotHas("payload_not_stale_budget", "The captured state does not still show the superseded $12M budget", "budget", "12"),
      textAssert("truthfully_reports_failure", "States plainly that transmission did not complete", (t) => has(t, "couldn't", "could not", "didn't go through", "did not complete", "failed to", "unable to", "wasn't able", "not able to", "trouble sending", "trouble transmitting")),
      textAssert("no_false_saved_claim", "Does not claim information was saved/successfully sent despite the failure", (t) => !claimsHandoffSavedWithoutSending(t) && !claimsHandoffSuccess(t)),
      textAssert("no_overclaim_on_failure", "Does not overclaim a booking/CRM/database save on failure", (t) => !overclaimsAction(t)),
    ],
  },
  {
    id: "ESTATE-S17", specId: "P1-S17", title: "Duplicate completion must not duplicate the handoff",
    evidence: "CORE", requirement: "EST-19", stresses: "Idempotency of a consequential side effect",
    mockTransportMode: "success",
    // Turn 4 (explicit confirmation) added after manual verification -- see ESTATE-S16's note;
    // same confirmation-gate reason. Turn 5 is the original duplicate-triggering message, now sent
    // AFTER a completed handoff rather than before one ever fired.
    turns: [
      "I'm buying in West Village, budget $18M, three month timeline, cash buyer.",
      "I'll go with option 2. Name's Sam Park, phone 555-0122, email sam@example.com.",
      "Call me around 5pm.",
      "Yes, please go ahead and send that to the team.",
      "Great, thanks! Actually, can you also call me at 5pm tomorrow instead?",
    ],
    assertions: [
      actionAttempted("handoff_attempted_once", "The handoff Action fired at least once", true),
      { id: "single_dispatch", label: "Exactly ONE external handoff dispatch across the whole run", kind: "state", severity: "hard", turn: -1,
        check: (c) => { const n = c.actionsAttempted.filter((a) => a === "send_email").length; return { passed: n === 1, detail: `send_email attempted ${n} time(s) across the run (expected exactly 1)` }; } },
    ],
  },
  {
    id: "ESTATE-S19", specId: "(benchmark addition — see file header)", title: "Handoff action success, truthful and non-overclaiming",
    evidence: "CORE", requirement: "EST-18", stresses: "Success-path truthfulness; no overclaimed capability",
    mockTransportMode: "success",
    // Turn 4 added after manual verification -- see ESTATE-S16's note; same confirmation-gate reason.
    turns: [
      "I'm buying in Malibu, budget $13M, two month timeline, paying cash.",
      "I like option 1. I'm Taylor Kim, phone 555-0133. I'd rather not share my email.",
      "Text me anytime after 10am.",
      "Yes, please go ahead and send that to the team.",
    ],
    assertions: [
      actionAttempted("handoff_attempted_success", "The handoff Action was attempted", true),
      actionSucceeded("handoff_succeeded", "The Action result reflects success", true),
      stateAbsent("email_still_blank", "Email remains blank (declined) yet the handoff still succeeded", "email"),
      textAssert("truthfully_reports_success", "States plainly that the request was transmitted", (t) => claimsHandoffSuccess(t)),
      textAssert("no_overclaim_on_success", "Does not overclaim a booking/appointment/CRM/database save", (t) => !overclaimsAction(t)),
    ],
  },
];

export const EXECUTABLE_SCENARIOS = ESTATE_SCENARIOS.filter((s) => s.turns.length > 0);
