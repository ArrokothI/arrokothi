const command = process.argv[2];

const commands: Record<string, string> = {
  generate: "./src/generate.ts",
  evaluate: "./src/evaluate.ts",
  judge: "./src/judge.ts",
  analyze: "./src/analyze.ts",
  review: "./src/render-conversations.ts",
};

const entrypoint = command ? commands[command] : undefined;
if (!entrypoint) {
  throw new Error(`Usage: run.ts <${Object.keys(commands).join("|")}> [options]`);
}

const commandModule = await import(entrypoint);
if (command === "analyze") await commandModule.main();
