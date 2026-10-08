// Raw Node events for TOOLS-01 floor assumptions; no verdict inference or mutation credit.
export default async function* reporter(events) {
  for await (const event of events) {
    yield JSON.stringify(event, (_key, value) => {
      if (value instanceof Error) {
        return { name: value.name, message: value.message, code: value.code,
          failureType: value.failureType, cause: value.cause };
      }
      return value;
    }) + '\n';
  }
}
