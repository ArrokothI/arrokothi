// node:test reporter: one JSON line per leaf test, {path: [...suite names, leaf name], verdict}.
export default async function* leafReporter(source) {
  const stack = [];
  for await (const event of source) {
    const data = event.data ?? {};
    if (event.type === 'test:start') {
      stack.length = data.nesting;
      stack.push(data.name);
    } else if ((event.type === 'test:pass' || event.type === 'test:fail') && data.details?.type !== 'suite') {
      const path = [...stack.slice(0, data.nesting), data.name];
      const verdict = event.type === 'test:pass' ? (data.skip ? 'skipped' : data.todo ? 'todo' : 'passed') : 'failed';
      const error = verdict === 'failed' ? String(data.details?.error?.failureType ?? '') + ':' + String(data.details?.error?.cause?.code ?? data.details?.error?.code ?? '') : undefined;
      yield JSON.stringify({ path, verdict, error }) + '\n';
    }
  }
}
