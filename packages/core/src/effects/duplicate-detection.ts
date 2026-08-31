/**
 * Exact logical-request comparison.
 *
 * `effectIdempotencyKey` (`fingerprint.ts`) indexes *candidates*. It does not, and must not,
 * decide by itself that two requests are the same logical operation: the digest it is built from is
 * a fast non-cryptographic checksum, and hash equality alone is not proof. This module is the second
 * step every duplicate decision goes through - a real comparison of the persisted request against
 * the incoming one - so that a coincidental (or contrived) key collision can narrow the search
 * without ever being trusted as the answer.
 *
 * Deliberately narrow in what it compares. `capability`, `operation`, and `input` are what makes two
 * requests the same real-world action. `resources` is included because a narrower or wider resource
 * binding can mean materially different external access even when the rest of the request is
 * identical - two requests are not "the same" merely because they'd produce the same JSON diff
 * elsewhere. `requestKey`, `deadlineMs`, `idempotency`, and `authorizationEvidence` are excluded on
 * purpose: they describe how the controller wants this request handled, not what it is.
 */

import { canonicalJson } from "../util/hash.ts";
import type { UseCapabilityProposal } from "./types.ts";

export function sameLogicalCapabilityRequest(a: UseCapabilityProposal, b: UseCapabilityProposal): boolean {
  if (a.capability !== b.capability) return false;
  if (a.operation !== b.operation) return false;
  if (canonicalJson(a.input) !== canonicalJson(b.input)) return false;

  const resourcesA = [...(a.resources ?? [])].sort();
  const resourcesB = [...(b.resources ?? [])].sort();
  if (resourcesA.length !== resourcesB.length) return false;
  return resourcesA.every((value, index) => value === resourcesB[index]);
}
