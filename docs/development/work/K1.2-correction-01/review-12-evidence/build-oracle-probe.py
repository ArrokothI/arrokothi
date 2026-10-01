from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description='Challenge the pinned fault-sweep classifier without changing Kernel source.')
parser.add_argument('source', type=Path, help='Repository checkout at reviewed H')
parser.add_argument('output', type=Path, help='Generated standalone TypeScript probe')
args = parser.parse_args()
root=args.source.resolve();src=(root/'packages/kernel/tests/sweep/fault-child.ts').read_text()
prefix=src[:src.index('const selected = (() =>')]
prefix=prefix.replace('import ts from "typescript";',f'import ts from {str(root / "node_modules/typescript/lib/typescript.js")!r};')
prefix=prefix.replace('const SWEEP_ROOT = dirname(fileURLToPath(import.meta.url));',f'const SWEEP_ROOT = {str(root / "packages/kernel/tests/sweep")!r};')
start=src.index('    if (k === n + 1) {\n      // The call with no fault')
end=src.index('\n  // Review 11\'s fault probe:',start)
body=src[start:end] # includes closing loop brace
prefix+='''\nfunction auditClassify(attempt: any, s0: any, s1: any, oracle: Oracle, alternate?: any) {
 const scenario = { oracle }; const state = attempt.state; const outcome = attempt.outcome;
 const newEpoch = s1.view.activation?.writerEpoch ?? -1;
 const result = { classes: {} as Record<string, number>, violations: [] as string[] };
 const classify = (kind: string) => {result.classes[kind] = (result.classes[kind] ?? 0) + 1;};
 const n=1; const where='reviewer oracle challenge';
 for (let k=1;k<=1;k++) {
'''+body+'''
 return result;
}
const scenario = SCENARIOS.find(s => s.name === 'report: enter a protocol hold')!;
const initialEnv = fresh(scenario); const initial = observe(initialEnv,setupGrantOf(initialEnv));
const successful = run(scenario,Infinity);
const malformedScenario = {...scenario, call: report({writerEpoch:'one'})};
const refused = run(malformedScenario,Infinity);
const badGrant = {...refused, state:{...refused.state,setupGrant:'unauthorized_submission'}};
const badAnswer = {...successful,outcome:{kind:'returned',result:{ok:true,value:{...((successful.outcome as any).result.value),changed:false,recoveryHolds:[]}}}};
const impossible = {state:{...initial,view:{...initial.view,progressRevision:123456}},outcome:{kind:'threw',error:new InjectedFault(1,'Reflect.apply')},label:'Reflect.apply'};
const results = [
 {name:'refusal revokes the setup grant',originalSetupGrant:refused.state.setupGrant,changedSetupGrant:badGrant.state.setupGrant,decision:auditClassify(badGrant,initial,successful.state,'strict')},
 {name:'accepted report returns the opposite hold answer',originalAnswer:(successful.outcome as any).result.value,changedAnswer:badAnswer.outcome.result.value,decision:auditClassify(badAnswer,initial,successful.state,'strict')},
 {name:'arbitrary progress corruption is labeled an Outcome apply prefix solely by method name',changedProgressRevision:impossible.state.view.progressRevision,decision:auditClassify(impossible,initial,successful.state,'outcome')}
];
process.stdout.write(JSON.stringify({purpose:'Mechanical challenge of the exact candidate oracle branches. These altered observations are not claims of production executions or analyzer-escaping programs.',results},null,2)+'\\n');
'''
args.output.write_text(prefix)
