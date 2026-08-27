import type { SessionEvent, SessionEventInput } from "../session/events.ts";
import type { DraftEvent } from "../session/store.ts";
import type { SessionState } from "../session/state.ts";
import { applyEvent } from "../session/state.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";

export interface TurnDurability {
  persistCheckpoint(journal: TurnJournal): Promise<SessionEvent[]>;
}

/**
 * The turn journal.
 *
 * A harness is handed one of these instead of a store. That means a harness cannot reach the
 * database, cannot mutate state directly, and cannot change anything without producing an event -
 * every state write is an event *by construction*, not by discipline.
 *
 * Sequence numbers are assigned provisionally here (`lastSeq + 1`, ...) so the projection stays
 * live during the turn. Runtime checkpoint writes mark the pending prefix durable, advance the
 * expected sequence, and leave later drafts pending for the next checkpoint or final append.
 */
export class TurnJournal {
  private current: SessionState;
  private durable: SessionState;
  private readonly drafts: DraftEvent[] = [];
  private readonly pendingEvents: SessionEvent[] = [];
  private readonly persistedEvents: SessionEvent[] = [];
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private nextSeq: number;

  constructor(state: SessionState, ids: IdGenerator, clock: Clock) {
    this.current = state;
    this.durable = state;
    this.ids = ids;
    this.clock = clock;
    this.nextSeq = state.lastSeq + 1;
  }

  get state(): SessionState {
    return this.current;
  }

  /** Events produced during this turn, in order. */
  get events(): SessionEvent[] {
    return [...this.persistedEvents, ...this.pendingEvents];
  }

  get pendingDrafts(): DraftEvent[] {
    return [...this.drafts];
  }

  /** Last durable sequence known to this turn. Used as the expected sequence for CAS appends. */
  get expectedSeq(): number {
    return this.durable.lastSeq;
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
    this.pendingEvents.push(event);
    this.current = applyEvent(this.current, event);
    return event;
  }

  /**
   * Marks all currently pending drafts durable. Runtime-owned checkpoint writes always flush the
   * full pending prefix, so no provisional event is left behind with a stale sequence.
   */
  markPersisted(stored: SessionEvent[]): void {
    if (stored.length !== this.drafts.length || stored.length !== this.pendingEvents.length) {
      throw new Error(`checkpoint persisted ${stored.length} event(s), but journal has ${this.drafts.length} pending draft(s)`);
    }
    for (const [index, event] of stored.entries()) {
      const draft = this.drafts[index]!;
      if (event.id !== draft.id || event.type !== draft.type || event.turn !== draft.turn) {
        throw new Error(`checkpoint event ${index} does not match the pending draft`);
      }
    }
    this.persistedEvents.push(...stored);
    this.drafts.length = 0;
    this.pendingEvents.length = 0;
    this.durable = stored.reduce(applyEvent, this.durable);
    this.current = this.durable;
    this.nextSeq = this.durable.lastSeq + 1;
  }

  /** Drops non-durable provisional events after a failed checkpoint/final CAS. */
  discardPending(): void {
    this.drafts.length = 0;
    this.pendingEvents.length = 0;
    this.current = this.durable;
    this.nextSeq = this.durable.lastSeq + 1;
  }
}
