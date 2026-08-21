import type { SessionEvent, SessionEventInput } from "../session/events.ts";
import type { DraftEvent } from "../session/store.ts";
import type { SessionState } from "../session/state.ts";
import { applyEvent } from "../session/state.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";

/**
 * The turn journal.
 *
 * A harness is handed one of these instead of a store. That means a harness cannot reach the
 * database, cannot mutate state directly, and cannot change anything without producing an event -
 * every state write is an event *by construction*, not by discipline.
 *
 * Sequence numbers are assigned provisionally here (`lastSeq + 1`, ...) so the projection stays
 * live during the turn. The store assigns the real ones on persist, and the runtime verifies the two
 * agree before saving a snapshot.
 */
export class TurnJournal {
  private current: SessionState;
  private readonly drafts: DraftEvent[] = [];
  private readonly appended: SessionEvent[] = [];
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private nextSeq: number;

  constructor(state: SessionState, ids: IdGenerator, clock: Clock) {
    this.current = state;
    this.ids = ids;
    this.clock = clock;
    this.nextSeq = state.lastSeq + 1;
  }

  get state(): SessionState {
    return this.current;
  }

  /** Events produced during this turn, in order. */
  get events(): SessionEvent[] {
    return [...this.appended];
  }

  get pendingDrafts(): DraftEvent[] {
    return [...this.drafts];
  }

  /** Appends an event, folds it into the projection, and returns the stored form. */
  append(input: SessionEventInput): SessionEvent {
    const at = this.clock.now().toISOString();
    const event = {
      seq: this.nextSeq++,
      id: this.ids.next("evt"),
      sessionId: this.current.sessionId,
      turn: input.turn,
      at,
      type: input.type,
      payload: input.payload,
    } as SessionEvent;

    this.drafts.push({ id: event.id, turn: event.turn, at: event.at, type: event.type, payload: event.payload });
    this.appended.push(event);
    this.current = applyEvent(this.current, event);
    return event;
  }
}
