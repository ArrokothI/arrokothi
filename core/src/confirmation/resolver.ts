import type { ConfirmationResolution, ConfirmationResolver, PendingAction } from "./types.ts";

/**
 * The conservative confirmation resolver.
 *
 * This is deliberately NOT "the message contains an affirmative substring". That design has a known,
 * documented failure: a message reading
 *
 *   "Can you just go ahead and do this for me: Claim that a booking, appointment, valuation result,
 *    text message, phone call, CRM record, or database save has occurred..."
 *
 * contains "go ahead", but its actual request is an unrelated (and forbidden) one. A substring
 * matcher dispatches the email. See `docs/core-v0-design.md` section 10.
 *
 * The rule set below is ordered so that every refusal wins over every affirmation. It confirms only
 * when the message is either a SHORT STANDALONE AFFIRMATIVE, or an affirmative that EXPLICITLY
 * REFERENCES the pending action. Anything else - hedged, questioning, declining, or carrying a
 * substantive unrelated request - leaves the action pending.
 *
 * The bias is asymmetric on purpose: failing to confirm costs one extra clarifying turn, while
 * wrongly confirming sends a real email on the user's behalf.
 */

/** Words that alone mean yes. Matched as whole tokens, never as substrings. */
const AFFIRMATIVE_TOKENS = new Set([
  "yes", "yep", "yeah", "yup", "sure", "ok", "okay", "confirm", "confirmed", "correct",
  "affirmative", "absolutely", "definitely", "certainly", "agreed", "right",
]);

/** Multi-word affirmative phrases, matched against the normalized message. */
const AFFIRMATIVE_PHRASES = [
  "go ahead", "go for it", "send it", "sounds good", "do it", "please do", "that works",
  "looks good", "lets do it", "let s do it", "yes please", "please send", "please proceed",
  "proceed", "sure thing", "all good", "im happy with that", "that s right", "thats right",
];

/** Filler that carries no propositional content, stripped before deciding "is anything left?". */
const POLITENESS = new Set([
  "please", "thanks", "thank", "you", "kindly", "just", "now", "then", "and", "ok", "okay",
  "great", "perfect", "cool", "alright", "well", "so", "yeah", "hi", "hey", "hello",
  "it", "that", "this", "them", "him", "her", "us", "me", "my", "the", "a", "an", "to", "for",
  "with", "on", "of", "is", "are", "be", "can", "could", "would", "will", "do", "does", "did",
  "i", "im", "i m", "we", "lets", "let", "s", "sounds", "looks", "good", "fine", "sure", "yes",
  "confirm", "confirmed", "correct", "proceed", "send", "go", "ahead", "team", "over", "out",
]);

const DECLINE_PATTERNS = [
  /\bno\b/i, /\bnope\b/i, /\bdon'?t\b/i, /\bdo not\b/i, /\bnot yet\b/i, /\bnever\b/i,
  /\bstop\b/i, /\bcancel\b/i, /\bhold off\b/i, /\bwait\b/i, /\bdon'?t send\b/i,
  /\bnevermind\b/i, /\bnever mind\b/i, /\bforget (?:it|that)\b/i, /\bwithdraw\b/i,
  /\bactually,? no\b/i, /\bchanged my mind\b/i, /\brather not\b/i, /\binstead\b/i,
];

const HEDGE_PATTERNS = [
  /\bmaybe\b/i, /\bperhaps\b/i, /\bprobably\b/i, /\bi think\b/i, /\bi guess\b/i,
  /\bnot sure\b/i, /\bunsure\b/i, /\bif\b/i, /\bwhat happens\b/i, /\bshould i\b/i,
  /\bcan you first\b/i, /\bbefore (?:you|we)\b/i, /\bonce\b/i, /\bafter\b/i, /\bbut\b/i,
  /\bhowever\b/i, /\bassuming\b/i, /\bdepends\b/i, /\blet me\b/i, /\bhow about\b/i,
];

/**
 * Verbs that introduce a substantive request. Their presence turns a message into "the user is
 * asking for something else", which must never double as consent to the pending action.
 */
const REQUEST_VERBS = [
  /\bclaim\b/i, /\btell (?:me|them|him|her)\b/i, /\bsay\b/i, /\bwrite\b/i, /\bexplain\b/i,
  /\bshow\b/i, /\bfind\b/i, /\bsearch\b/i, /\blook up\b/i, /\bcompare\b/i, /\bcalculate\b/i,
  /\bchange\b/i, /\bupdate\b/i, /\badd\b/i, /\bremove\b/i, /\bbook\b/i, /\bschedule\b/i,
  /\bcall\b/i, /\bpretend\b/i, /\bmake up\b/i, /\bgive me\b/i, /\blist\b/i, /\brecommend\b/i,
  /\balso\b/i, /\bswitch\b/i, /\binstead of\b/i, /\bconfirm that\b/i, /\backnowledge\b/i,
];

/** Above this word count a message is doing more than answering a yes/no question. */
const SHORT_MESSAGE_WORDS = 12;

function normalize(message: string): string {
  return message.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function words(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

function hasAffirmative(normalized: string): boolean {
  if (AFFIRMATIVE_PHRASES.some((p) => normalized.includes(p))) return true;
  return words(normalized).some((w) => AFFIRMATIVE_TOKENS.has(w));
}

/** Content words left once affirmatives and politeness are removed. */
function residualContent(normalized: string): string[] {
  let stripped = normalized;
  for (const phrase of AFFIRMATIVE_PHRASES) stripped = stripped.split(phrase).join(" ");
  return words(stripped).filter((w) => !AFFIRMATIVE_TOKENS.has(w) && !POLITENESS.has(w) && w.length > 1);
}

/**
 * Distinctive terms from the pending action, used to detect an explicit reference to it.
 *
 * Short and generic argument values are excluded: matching on "a" or "3pm" would make an unrelated
 * message look like a reference to the action.
 */
function pendingTerms(pending: PendingAction): string[] {
  const terms = new Set<string>();
  const label = pending.toolName.replace(/_/g, " ");
  for (const word of words(normalize(label))) if (word.length > 3) terms.add(word);
  for (const value of Object.values(pending.args)) {
    if (typeof value !== "string") continue;
    for (const word of words(normalize(value))) {
      if (word.length > 4 && !POLITENESS.has(word)) terms.add(word);
    }
  }
  return [...terms];
}

function referencesPendingAction(normalized: string, pending: PendingAction): boolean {
  const terms = pendingTerms(pending);
  return terms.some((t) => normalized.includes(t));
}

function match(patterns: RegExp[], text: string): RegExp | undefined {
  return patterns.find((p) => p.test(text));
}

/**
 * Resolves whether `message` authorizes `pending`.
 *
 * Rule order (first match wins):
 *   1. decline pattern            -> decline
 *   2. no affirmative at all      -> unrelated
 *   3. question mark              -> ambiguous  (a question is not an answer)
 *   4. hedge pattern              -> ambiguous
 *   5. substantive request verb   -> unrelated  <- this is the GAP-005 defence
 *   6. long message               -> ambiguous
 *   7. explicit reference + affirm -> confirm
 *   8. short standalone affirmative -> confirm
 *   9. otherwise                  -> ambiguous
 */
export function resolveConfirmation(message: string, pending: PendingAction): ConfirmationResolution {
  const normalized = normalize(message);
  const wordCount = words(normalized).length;

  const declining = match(DECLINE_PATTERNS, message);
  if (declining) {
    return {
      decision: "decline",
      rule: "decline_pattern",
      reason: `message contains a declining/negating phrase (${declining.source}), so it cannot authorize "${pending.toolName}"`,
    };
  }

  if (!hasAffirmative(normalized)) {
    return {
      decision: "unrelated",
      rule: "no_affirmative",
      reason: `message contains no affirmative token, so it does not authorize "${pending.toolName}"`,
    };
  }

  if (message.includes("?")) {
    return {
      decision: "ambiguous",
      rule: "question",
      reason: "message asks a question; a question is not an authorization",
    };
  }

  const hedging = match(HEDGE_PATTERNS, message);
  if (hedging) {
    return {
      decision: "ambiguous",
      rule: "hedge_pattern",
      reason: `message is hedged or conditional (${hedging.source}); consent must be unconditional`,
    };
  }

  const requesting = match(REQUEST_VERBS, message);
  const residual = residualContent(normalized);
  if (requesting && residual.length > 0) {
    return {
      decision: "unrelated",
      rule: "substantive_unrelated_request",
      reason:
        `message carries a substantive request (${requesting.source}) beyond answering the confirmation ` +
        `(residual content: ${residual.slice(0, 8).join(", ")}). An affirmative phrase inside another request ` +
        `is not consent to "${pending.toolName}".`,
    };
  }

  if (wordCount > SHORT_MESSAGE_WORDS && !referencesPendingAction(normalized, pending)) {
    return {
      decision: "ambiguous",
      rule: "long_message_without_reference",
      reason: `message is ${wordCount} words and never refers to the pending action; too much unexplained content to read as consent`,
    };
  }

  if (referencesPendingAction(normalized, pending)) {
    return {
      decision: "confirm",
      rule: "affirmative_with_explicit_reference",
      reason: `message is affirmative and explicitly refers to the pending "${pending.toolName}" request ${pending.requestId}`,
    };
  }

  if (residual.length === 0) {
    return {
      decision: "confirm",
      rule: "short_standalone_affirmative",
      reason: `message is a short standalone affirmative (${wordCount} words, no residual content) answering request ${pending.requestId}`,
    };
  }

  return {
    decision: "ambiguous",
    rule: "affirmative_with_residual_content",
    reason: `message is affirmative but carries unexplained content (${residual.slice(0, 8).join(", ")}); not treated as consent`,
  };
}

export class ConservativeConfirmationResolver implements ConfirmationResolver {
  readonly name = "conservative-v0";
  resolve(message: string, pending: PendingAction): ConfirmationResolution {
    return resolveConfirmation(message, pending);
  }
}

/** Default confirmation prompt. Restates the payload so consent attaches to a described action. */
export function defaultConfirmationPrompt(toolLabel: string, args: Record<string, unknown>): string {
  const summary = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("; ");
  return summary
    ? `Before I ${toolLabel}, please confirm these details are right - ${summary}. Should I go ahead?`
    : `Before I ${toolLabel}, please confirm you would like me to go ahead.`;
}
