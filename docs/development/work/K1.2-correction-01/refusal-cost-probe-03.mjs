// Run sealed review-04 probes in their required directory layout. Never modify sealed bytes.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root = process.cwd(), work = mkdtempSync(join(tmpdir(), 'k12-r4-probes-'));
let failed = false;
try {
  symlinkSync(resolve(root, 'packages'), join(work, 'packages'), 'dir');
  symlinkSync(resolve(root, 'node_modules'), join(work, 'node_modules'), 'dir');
  mkdirSync(join(work, 'probes'));
  for (const file of ['p4-exact-coordinates.ts', 'p5-refusal-cost.ts']) cpSync(join(root, 'docs/development/work/K1.2-correction-01/review-04', file), join(work, 'probes', file));
  const runs = [['p4-exact-coordinates.ts'], ['p5-refusal-cost.ts', 'accept'], ['p5-refusal-cost.ts', 'refuse'],
    ...[1, 8].flatMap(roots => ['accept', 'refuse'].map(mode => ['p5-refusal-cost.ts', mode, 'outcome', String(roots)]))];
  for (const [file, ...args] of runs) {
    const command = ['--experimental-strip-types', '--expose-gc', '--max-old-space-size=4096', `probes/${file}`, ...args];
    console.log('COMMAND node ' + command.join(' '));
    const run = spawnSync(process.execPath, command, { cwd: work, encoding: 'utf8', timeout: 120000 });
    console.log(run.stdout + run.stderr);
    console.log(`exit=${run.status} signal=${run.signal} error=${run.error?.message ?? 'none'}`);
    failed ||= run.status !== 0 || !!run.error;
  }
} finally { rmSync(work, { recursive: true, force: true }); }
process.exitCode = failed ? 1 : 0;
