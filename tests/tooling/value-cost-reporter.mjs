// K1.1-correction-03 review 01 (KC3-R1-EVID-02): the value-cost probe's test reporter.
//
// It writes one JSON line per finished test or suite and one for the run summary. For a failure it records
// the failure type and whether its cause is an assertion error that `value-cost-witness.mjs` saw a
// test-side assertion function throw. The reporter and the tests run in one process, so the cause is the
// thrown object itself. A run that never loads produces no line at all.
const WITNESS = Symbol.for('arrokothi.value-cost.witness');
const bounded = (text) => (typeof text === 'string' ? text : null);

export default async function* valueCostReporter(source) {
  const witnessed = globalThis[WITNESS];
  const parents = [];
  for await (const event of source) {
    const data = event.data ?? {};
    if (event.type === 'test:start') {
      parents.length = data.nesting;
      parents[data.nesting] = data.name;
      yield `${JSON.stringify({ event: 'start', name: bounded(data.name), nesting: data.nesting })}\n`;
    } else if (event.type === 'test:pass' || event.type === 'test:fail') {
      const details = data.details ?? {};
      const error = details.error;
      const cause = error?.cause;
      const witness = cause !== null && typeof cause === 'object' && witnessed instanceof WeakMap ? witnessed.get(cause) : undefined;
      yield `${JSON.stringify({
        event: event.type === 'test:pass' ? 'pass' : 'fail',
        name: bounded(data.name),
        nesting: data.nesting,
        path: [...parents.slice(0, data.nesting), data.name],
        declaration: { file: data.file ?? null, line: data.line === undefined ? null : data.line - (witnessed?.sourceOffsets?.get(data.file) ?? 0), column: data.column ?? null },
        type: details.type ?? null,
        skip: data.skip !== undefined && data.skip !== false,
        todo: data.todo !== undefined && data.todo !== false,
        failureType: error?.failureType ?? null,
        cause: cause === null || cause === undefined ? null : { name: bounded(cause.name), code: bounded(cause.code) },
        witnessed: witness === undefined ? null : witness,
      })}\n`;
    } else if (event.type === 'test:summary') {
      yield `${JSON.stringify({ event: 'summary', counts: data.counts ?? null, success: data.success ?? null })}\n`;
    }
  }
}
