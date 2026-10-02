// Reports leaf results, preserving assertion identity separately from process exit.
export default async function* reporter(events) {
  const results = [];
  for await (const { type, data } of events) {
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    if (data.details?.type === 'suite') continue;
    const error = data.details?.error;
    const cause = error?.cause ?? error;
    results.push({ name: data.name, passed: type === 'test:pass',
      skipped: Boolean(data.skip || data.todo), code: cause?.code ?? null,
      message: cause?.message ?? null, failureType: error?.failureType ?? null });
  }
  yield JSON.stringify(results);
}
