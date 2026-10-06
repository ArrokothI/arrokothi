// TOOLS-01 title catalog reporter (design 05 §4). It forwards the facts the catalog needs, one JSON
// object per line; it infers no verdict, kind or leaf. packet_tools.py pairs and validates them.
import { resolve } from 'node:path';

const forwarded = new Set(['test:start', 'test:pass', 'test:fail']);
const summary = /^(tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/;

export default async function* catalogReporter(events) {
  for await (const { type, data } of events) {
    if (forwarded.has(type)) {
      const row = { type, name: data.name, nesting: data.nesting, file: data.file ?? null,
        line: data.line ?? null, column: data.column ?? null };
      if (type !== 'test:start') {
        row.testNumber = data.testNumber ?? null;
        row.skip = data.skip !== undefined && data.skip !== false;
        row.todo = data.todo !== undefined && data.todo !== false;
        if (data.details && 'type' in data.details) row.details_type = data.details.type;
        const error = data.details?.error;
        if (error) {
          // R1-04 (owner choice 09): the failure's kind and its cause's name and code; the stack only by its shape.
          row.failure_type = error.failureType ?? null;
          const cause = error.cause;
          const object = cause !== null && (typeof cause === 'object' || typeof cause === 'function');
          row.cause_name = object && typeof cause.name === 'string' ? cause.name : null;
          row.cause_code = object && typeof cause.code === 'string' ? cause.code : null;
          const stack = object ? cause.stack : undefined;
          row.cause_stack = stack === undefined || stack === null ? null : { type: typeof stack,
            frames: typeof stack === 'string' ? stack.split('\n').filter((line) => /^\s+at\s/.test(line)).length : 0 };
        }
      }
      // A zero-match file run reports one result named after its file at 1:1 (D05-CHK-02).
      row.synthetic = data.nesting === 0 && data.line === 1 && data.column === 1 && typeof data.file === 'string' &&
        resolve(data.name) === resolve(data.file);
      yield JSON.stringify(row) + '\n';
    } else if (type === 'test:diagnostic' && data.nesting === 0 && summary.test(data.message)) {
      const [, label, count] = data.message.match(summary);
      yield JSON.stringify({ type: 'summary', label, count: Number(count) }) + '\n';
    }
  }
}
