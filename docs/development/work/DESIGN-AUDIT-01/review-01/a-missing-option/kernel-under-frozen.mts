// Reviewer probe: does the current Kernel canonicalize a plain value in a frozen-intrinsics realm?
// Usage: node [--frozen-intrinsics] --experimental-strip-types --no-warnings kernel-under-frozen.mts <repo-root>
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const { canonicalize } = await import(pathToFileURL(root + '/packages/kernel/src/values.ts').href);
const r = canonicalize({ b: [true, null, 'text'], a: 1 });
console.log(JSON.stringify({ node: process.version, execArgv: process.execArgv, ok: r.ok, canonical: r.ok ? r.value.canonical : undefined, issues: r.ok ? undefined : r.issues }));
