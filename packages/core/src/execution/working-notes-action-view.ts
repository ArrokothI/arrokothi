/**
 * The authorized, model-exposable local Working Notes action.
 *
 * Unlike the capability and Structured Memory write branches, this view needs no resolver, no
 * store read, and no policy call: an update to `working_notes_set` mutates only the Agent
 * controller's *own* local scratch frame and crosses no Execution or runtime boundary, so the
 * authored enablement (`spec.workingNotes.write === true`) is the whole input.
 *
 * ```text
 * spec.workingNotes.write === true   ->  one entry
 * anything else                      ->  empty view
 * ```
 *
 * Authored enablement of local controller functionality is still not authority. It is not reusable
 * as permission for a Structured Memory write, for child visibility, for cross-Execution handoff,
 * or for any external action. F.2b adds the explicit visibility semantics for crossing an Execution
 * boundary; F.2a has none.
 */

import { hashValue } from "../util/hash.ts";

/** The one entry this view can carry. Identity plus a model-facing description; no key. */
export interface ActiveWorkingNotesActionEntry {
  readonly kind: "working_notes_set";
  readonly description: string;
}

export interface ActiveWorkingNotesActionView {
  /** Content-derived correlation identity. Membership is not permission. */
  readonly viewId: string;
  readonly entries: readonly ActiveWorkingNotesActionEntry[];
}

const WORKING_NOTES_SET_DESCRIPTION =
  "Record or replace one entry in your local Working Notes - temporary scratch state for plans, " +
  "hypotheses, and candidate evidence. It is not durable application state, not shared with other " +
  "Executions, and not authority. Supply { key, content }; the key is your own local label.";

const EMPTY_VIEW: ActiveWorkingNotesActionView = Object.freeze({
  viewId: `awnav_${hashValue({ entries: [] })}`,
  entries: Object.freeze([]) as readonly ActiveWorkingNotesActionEntry[],
});

/** The fail-closed constant: no local Working Notes action is exposed. */
export function emptyActiveWorkingNotesActionView(): ActiveWorkingNotesActionView {
  return EMPTY_VIEW;
}

/**
 * The view for one invocation, derived entirely from authored local enablement.
 *
 * Deterministic: the same `enabled` always yields the same `viewId`, and disabled is the shared
 * empty constant.
 */
export function createActiveWorkingNotesActionView(enabled: boolean): ActiveWorkingNotesActionView {
  if (!enabled) return EMPTY_VIEW;
  const entries: readonly ActiveWorkingNotesActionEntry[] = [
    { kind: "working_notes_set", description: WORKING_NOTES_SET_DESCRIPTION },
  ];
  return { viewId: `awnav_${hashValue({ entries })}`, entries };
}
