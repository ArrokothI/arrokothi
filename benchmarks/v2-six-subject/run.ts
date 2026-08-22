const generateOnly = process.argv.includes("--generate-only");
const judgeOnly = process.argv.includes("--judge-only");

if (generateOnly === judgeOnly) {
  throw new Error("Choose exactly one orchestration mode: --generate-only or --judge-only");
}

if (generateOnly) {
  await import("./generate-only.ts");
} else {
  await import("./judge-only.ts");
}
