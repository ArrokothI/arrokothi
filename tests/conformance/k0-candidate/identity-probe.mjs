// K1.4-candidate: the mutation registry's probe for the identity mechanism rows M1 to M7
// (design 03 addendum 01 §A4; owner choice 04; 012 § Maintained corpus and mutation registry).
//
// usage: node --no-warnings --experimental-strip-types tests/conformance/k0-candidate/identity-probe.mjs <M-n> [--link-workspace-kernel]
//
// It runs that row's one witness from `identity-witnesses.ts`, in the tree it is started in, and prints
// one observation for `scripts/packet_tools.py`:
//   - every assertion of the witness holds   -> passed, exit 0 (the registry's control);
//   - at least one named assertion fails     -> not passed, exit 17, with the failed assertions named;
//   - anything else (a crash, an import failure, an error that is not one of the candidate's two
//     declared ones)                         -> this probe throws. That is an invalid run, never a kill.
//
// The registry runs each case in a temporary copy of the listed files. That copy has no workspace
// install, so the package name `@arrokothi/kernel` resolves nowhere. With `--link-workspace-kernel` the
// probe makes the one link `npm ci` makes for the workspace, `node_modules/@arrokothi/kernel` ->
// `packages/kernel`, when it is absent. Without the flag it creates nothing. Either way it then checks,
// by real path, that the package root resolves to this tree's `packages/kernel/src/index.ts`.
import { existsSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MUTANTS } from './identity-mutants.ts';

const [id, ...flags] = process.argv.slice(2);
const row = MUTANTS.find((candidate) => candidate.id === id);
if (row === undefined) throw new Error('Unknown identity row: ' + id);
if (flags.some((flag) => flag !== '--link-workspace-kernel')) throw new Error('Unknown flag');

const root = realpathSync(process.cwd());
if (realpathSync(resolve(import.meta.dirname, '../../..')) !== root) throw new Error('Start the probe from the root of the tree that holds it');
const link = resolve(root, 'node_modules/@arrokothi/kernel');
if (flags.includes('--link-workspace-kernel') && !existsSync(link)) {
  mkdirSync(resolve(root, 'node_modules/@arrokothi'), { recursive: true });
  symlinkSync(resolve(root, 'packages/kernel'), link, 'dir');
}
const loaded = realpathSync(fileURLToPath(import.meta.resolve('@arrokothi/kernel')));
const expected = realpathSync(resolve(root, 'packages/kernel/src/index.ts'));
if (loaded !== expected) throw new Error(`The Kernel package root resolves to ${loaded}, not to this tree's ${expected}`);

// Loaded only now: the candidate imports the package root, which had to resolve first.
const { WITNESSES } = await import('./identity-witnesses.ts');
const witness = WITNESSES[row.id];
if (witness === undefined) throw new Error('No witness for ' + row.id);
const failures = witness();
const passed = failures.length === 0;
const label = row.id.toLowerCase();
console.log(JSON.stringify({
  case: `k14-candidate.identity-${label}`, assertion: `k14-candidate.identity-${label}.killed`, reached: true, passed,
  ...(passed ? {} : { failures }),
}));
process.exitCode = passed ? 0 : 17;
