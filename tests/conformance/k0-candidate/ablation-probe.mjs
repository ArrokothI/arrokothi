// K1.4-candidate: the mutation registry's probe for the Kernel ablations ABL-1 to ABL-5
// (owner choice 03; review 01 K14C-R01-02; 012 § Maintained corpus and mutation registry).
//
// usage: node --no-warnings --experimental-strip-types tests/conformance/k0-candidate/ablation-probe.mjs <ABL-n> [--link-workspace-kernel]
//
// It runs the row's witness schedule through `kernelCandidate` and the fixture's unmodified runner, in
// the tree it is started in, and prints one observation for `scripts/packet_tools.py`:
//   - the schedule PASSES                         -> passed, exit 0 (the registry's control);
//   - it FAILS exactly as the row says (first failure at the row's step, every listed field named, the
//     row's observed text, no throw)              -> not passed, exit 17 (a kill);
//   - anything else (REFUSED, a throw, a failure at another step or in other fields, a Kernel loaded
//     from somewhere else)                        -> this probe throws. That is an invalid run, never a kill.
//
// The registry runs each case in a temporary copy of the listed files. That copy has no workspace
// install, so the package name `@arrokothi/kernel` resolves nowhere. With `--link-workspace-kernel` the
// probe makes the one link `npm ci` makes for the workspace, `node_modules/@arrokothi/kernel` ->
// `packages/kernel`, when it is absent. Without the flag it creates nothing. Either way it then checks
// that the package root resolves, by real path, to this tree's `packages/kernel/src/index.ts`: the
// candidate must reach the copy's (possibly edited) Kernel through its own package-root import.
import { existsSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ABLATIONS, killProblems } from './ablation-table.ts';

const [id, ...flags] = process.argv.slice(2);
const ablation = ABLATIONS.find((row) => row.id === id);
if (ablation === undefined) throw new Error('Unknown ablation: ' + id);
if (flags.some((flag) => flag !== '--link-workspace-kernel')) throw new Error('Unknown flag');

const root = realpathSync(process.cwd());
if (realpathSync(resolve(import.meta.dirname, '../../..')) !== root) throw new Error('Start the probe from the root of the tree that holds it');
const link = resolve(root, 'node_modules/@arrokothi/kernel');
if (flags.includes('--link-workspace-kernel') && !existsSync(link)) {
  mkdirSync(resolve(root, 'node_modules/@arrokothi'), { recursive: true });
  symlinkSync(resolve(root, 'packages/kernel'), link, 'dir');
}
const loaded = fileURLToPath(import.meta.resolve('@arrokothi/kernel'));
const expected = resolve(root, 'packages/kernel/src/index.ts');
if (loaded !== expected) throw new Error(`The Kernel package root resolves to ${loaded}, not to this tree's ${expected}`);

// Loaded only now: the candidate imports the package root, which had to resolve first.
const { kernelCandidate } = await import('./kernel-candidate.ts');
const { runScenario } = await import('../k0/fixture.ts');
const { createOperationSink } = await import('../k0/operation-sink.ts');
const { ALL_SCENARIOS } = await import('../k0/scenarios.ts');

const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === ablation.scenarioId);
if (scenario === undefined) throw new Error('No such scenario: ' + ablation.scenarioId);
const result = runScenario(kernelCandidate, scenario, createOperationSink());
if (result.outcome !== 'PASS' && result.outcome !== 'FAIL') throw new Error('The schedule did not run: ' + JSON.stringify(result));

const passed = result.outcome === 'PASS';
if (passed && result.steps !== scenario.steps.length) throw new Error('A PASS that did not run every step');
if (!passed) {
  const problems = killProblems(ablation, result.failures);
  if (problems.length > 0) throw new Error(`${id}: a failure that is not the row's kill: ${problems.join('; ')}`);
}
const label = id.toLowerCase();
console.log(JSON.stringify({
  case: `k14-candidate.${label}`, assertion: `k14-candidate.${label}.killed`, reached: true, passed,
  ...(passed ? {} : { failures: [`${ablation.scenarioId} step ${ablation.step}: ${ablation.fields.join(', ')}`] }),
  scenario: ablation.scenarioId, steps: scenario.steps.length,
}));
process.exitCode = passed ? 0 : 17;
