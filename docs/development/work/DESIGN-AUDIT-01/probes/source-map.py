#!/usr/bin/env python3
from pathlib import Path
import subprocess,re
P=Path(__file__).resolve().parents[1];R=P.parents[3];B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
p='packages/kernel/src/coordinator.ts';s=subprocess.check_output(['git','-C',str(R),'show',B+':'+p]).decode()
print('base',B,'path',p)
for n,l in enumerate(s.splitlines(),1):
 if re.search(r'^  (?:createExecution|submitInput|dispatch|redeliver|inspect|visibleExecutions|submitOutcome|requestTakeover|recoverExecution|reportProtocolFailure|#accept|#mint|#visible|#requireControl|#refusal|#deliver)\(|^(?:const (?:holdHistoryRecord|takeoverHistoryRecord|applyControlCommit)|function viewOf)',l):print(n,l.strip())
