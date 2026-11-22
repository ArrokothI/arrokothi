"""Independent arithmetic from design 05 sections 4-5; imports no candidate or oracle.
Run with Python 3. The command sequence is transcribed from the written declaration.
"""
import json
from collections import Counter

lengths = dict(create=2, create_retry=2, accept_event=2, dispatch=2,
               redeliver_dispatch=2, submit_outcome=2, resubmit_outcome=2,
               accept_cancellation=2, deliver_timer=3, recover=3, takeover=3, inspect=1)
observations = ('create create create_retry create_retry accept_event inspect dispatch '
                'redeliver_dispatch takeover recover submit_outcome inspect submit_outcome '
                'resubmit_outcome deliver_timer deliver_timer inspect accept_cancellation accept_event').split()
O, X, P, U, N = len(observations), len(lengths), 2, 11, sum(lengths.values()) + 5
ocalls = sum(lengths[k] for k in observations)
xcalls = sum(lengths.values())
ncalls = sum(n * (n + 1) // 2 for n in lengths.values()) + 1 + 1 + 2 + 1 + 1
whole = Counter(observations) + Counter(lengths.keys())
calls = ocalls + xcalls
trailing = sum(v for k, v in whole.items() if k != 'inspect')
retargets = calls - whole['create'] - whole['create_retry'] - whole['deliver_timer']
delivering = sum(whole[k] for k in ['dispatch', 'redeliver_dispatch', 'takeover'])
operators = {
    'drop/call-missing': ocalls + xcalls + P + ncalls,
    'replace/call-method': 12 * calls,
    'insert/call-extra': 13 * (calls + O + X + P + U),
    'retarget/target': retargets - trailing,
    'retarget/inspection': trailing,
    'pending-arity/target': whole['deliver_timer'],
    'fire-generation/target': whole['deliver_timer'],
    'fire-kind/target': whole['deliver_timer'],
    'exchange-activation/target': whole['recover'] + whole['takeover'],
    'exchange-epoch/target': whole['takeover'],
    'other-inspection/inspection': O - observations.count('inspect'),
    'copied-field/inspection': 5 * O,
    'wrong-exit/exit': 3 * (O + X + P) + 2 * U,
    'swallow-inspection/answer': N,
    'swallow-previous/answer': N,
    'report-drop/report-missing': delivering,
    'report-duplicate/report-extra': delivering,
    'report-method/report-method': delivering,
    'report-owner/report-delivery': delivering,
    'report-outside/report-extra': delivering,
}
assert [O, X, P, U, N] == [19, 12, 2, 11, 31]
assert [ocalls, xcalls, ncalls] == [39, 26, 49]
assert list(operators.values()) == [116,780,1417,29,27,3,3,3,4,2,16,95,121,31,31,6,6,6,6,6]
result = dict(classes=dict(O=O,X=X,P=P,U=U,N=N), cases=O+X+P+U+N,
              rows=12+12+10+2+26, slots=xcalls, delivery_slots=3,
              calls=dict(O=ocalls,X=xcalls,P=P,U=0,N=ncalls),
              operators=operators, mutations=sum(operators.values()),
              separate_D05_controls=dict(missing_value_cases=11, variants_each=3, report_arity=1))
assert [result['cases'],result['rows'],result['slots'],result['mutations']] == [75,62,26,2708]
print(json.dumps(result, indent=2))
