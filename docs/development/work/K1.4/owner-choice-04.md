# K1.4 — owner choice 04: `unknown` in the ingress accounting (L-29)

**Record type:** owner decision. Recorded on 2026-11-07 by the K1.4 implementer's Claude Code desktop session
(`claude-opus-5-5`) at the owner's instruction, during the correction round after
[review 01](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md)
(K14-R1-03) and
[design check 03](https://github.com/ArrokothI/arrokothi/blob/3e55960e0493854490ac83a420ee12295c003e82/docs/development/work/K1.4/design-check-03.md)
(D03-CHK-02).

## Question

The owner's instruction for this round said: "Reconcile L-29 and integration's managed-native-job paragraph with
the `unknown` disposition. If that changes what L-29 promises rather than its wording, stop and ask the owner."

It does change the promise:
- [017](../../017-known-limitations.md) L-29 says an acknowledgment means the Event was either "forwarded into the
  native mailbox, or discarded by a terminal decision and reported as `discarded`".
- [Integration](../../../../mental-model/mechanisms/integration.md) states the same as the managed-native-job
  obligation.
- When the Driver's native forward throws before its receipt returns, the delivery may or may not have committed.
  Design check 03 reproduced a committed one: the input was delivered and woke the member, then the scheduler's
  read failed.
- An `unknown` entry therefore leaves an acknowledged Event that is neither known to be in the native mailbox nor
  reported `discarded`.

The implementer asked:

> K1.4 R1-03: when the Driver's native forward throws before returning its receipt, the native delivery may or may
> not have committed (design check 03 reproduced a committed one). L-29 and mental-model/mechanisms/integration.md
> currently promise that every acknowledged Event is either forwarded into the native mailbox or reported
> `discarded`; an `unknown` entry breaks that promise, not just its wording. Which should the correction do?

There were two options:

| Option | Description given |
|---|---|
| Amend L-29 (Recommended) | Acknowledgment means accounted for: forwarded, discarded, or `unknown` (forward_failed: delivery may or may not have committed). E still fails `native_error` as now. L-29 and integration's managed-native-job paragraph gain the third case; never a second forward. |
| Keep L-29's promise | The Driver controls the native event ID, looks up whether the failed delivery committed, and reports forwarded/discarded truthfully. If that lookup also fails, it acknowledges nothing: protocol-failure hold with the lineage ended, so E is held instead of failing. |

## Answer

The owner's answer, verbatim:

```text
Amend L-29 (Recommended)
```

## Effect

- An acknowledgment means the Outcome accounted for the Event in `ingress_result` in one of three ways:
  - forwarded into the native mailbox;
  - discarded by a terminal decision, reported `discarded`;
  - `unknown` with reason `forward_failed`: a forward that threw before its receipt, whose native delivery may or
    may not have committed.

  It still never means that native processing happened.
- The Execution ends with `arrokothi.bridge.native_error`, as at the reviewed H. An `unknown` Event is never
  forwarded a second time.
- 017 L-29 and the managed-native-job paragraph of `mental-model/mechanisms/integration.md` gain the third case,
  in the correction's payload.
- Not decided here: the packet's acceptance.
