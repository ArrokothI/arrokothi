// Codex desktop/GPT-6; sandboxed local product reads only, no product mutation or acceptance.
// Additional corpus after review-01 plain-object probe; the serializer-window mechanism covers all successful captures.
import { pathToFileURL } from 'node:url';
const { canonicalize } = await import(pathToFileURL(process.argv[2] + '/packages/kernel/src/values.ts').href);
const results = [null, true, 0, 'text', [], {}, [1], {a: 1}].map((value) => {
  const r = canonicalize(value);
  return {input: value, ok: r.ok, canonical: r.ok ? r.value.canonical : null, codes: r.ok ? [] : r.issues.map(x => x.code)};
});
console.log(JSON.stringify({node: process.version, results}));
