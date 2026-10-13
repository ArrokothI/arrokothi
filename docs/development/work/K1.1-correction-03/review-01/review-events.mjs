// Independent review reporter: retain selected leaf outcomes and actual errors.
import { inspect } from 'node:util';
const show = value => inspect(value, { depth: 4, maxArrayLength: 25, maxStringLength: 300 });
function errorRecord(error, depth = 0) {
  if (error == null || depth > 5) return null;
  return { name: error.name, message: error.message, code: error.code,
    failureType: error.failureType, stack: error.stack,
    actual: show(error.actual), expected: show(error.expected), operator: error.operator,
    cause: errorRecord(error.cause, depth + 1) };
}
export default async function* report(source) {
  const stack = [];
  for await (const event of source) {
    const d = event.data ?? {};
    if (event.type === 'test:start') { stack.length = d.nesting; stack.push(d.name); }
    if ((event.type === 'test:pass' || event.type === 'test:fail') && d.details?.type !== 'suite') {
      yield JSON.stringify({ event: event.type, file: d.file, line: d.line,
        path: [...stack.slice(0, d.nesting), d.name], skip: d.skip, todo: d.todo,
        error: errorRecord(d.details?.error) }, (_, v) => typeof v === 'bigint' ? String(v) : v) + '\n';
    } else if (event.type === 'test:summary') yield JSON.stringify({ event: event.type, data: d }) + '\n';
  }
}
