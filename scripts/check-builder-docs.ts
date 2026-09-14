/** Focused offline check. Never crawls unrelated examples or evaluation material. */
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const guide = "docs/guides";
const example = "examples/execution-kernel-minimal";
const sources = [
  "docs/development/README.md",
  "README.md", "AGENTS.md", "docs/README.md",
  "packages/sdk/README.md", "docs/legacy/development/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md",
  "docs/legacy/development/2026-09-baseline/007-application-builder-ergonomics-findings.md",
  ".agents/skills/arrokothi-agent-builder/SKILL.md",
  ...(await readdir(join(root, guide), { recursive: true })).filter((name) => name.endsWith(".md")).sort().map((name) => `${guide}/${name}`),
  `${example}/README.md`,
];
const errors: string[] = [];
const texts = new Map<string, string>();
async function read(path: string) {
  let text = texts.get(path);
  if (text === undefined) { text = await readFile(path, "utf8"); texts.set(path, text); }
  return text;
}
function headings(markdown: string) {
  const slugs = new Set<string>();
  const counts = new Map<string, number>();
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)?.[1];
    if (!heading) continue;
    const slug = heading.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "").replace(/\s/g, "-");
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    slugs.add(count ? `${slug}-${count}` : slug);
  }
  return slugs;
}
let links = 0;
for (const source of sources) {
  const sourcePath = join(root, source);
  const content = await read(sourcePath);
  // This guide uses inline Markdown links; ignore fenced examples, which may contain bracket syntax.
  const prose = content.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "");
  for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1]!;
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) continue;
    const [path = "", fragment] = href.split("#");
    let target = resolve(dirname(sourcePath), decodeURIComponent(path));
    if (!target.startsWith(root + sep)) { errors.push(`${source}: link escapes repository: ${href}`); continue; }
    // Isolation is intentional even if a future guide accidentally links such a target.
    if (/benchmark/i.test(relative(root, target))) { errors.push(`${source}: out-of-scope link: ${href}`); continue; }
    try {
      if ((await stat(target)).isDirectory()) target = join(target, "README.md");
      await stat(target);
      if (fragment && extname(target) === ".md" && !headings(await read(target)).has(decodeURIComponent(fragment))) {
        errors.push(`${source}: missing anchor: ${href}`);
      }
      links++;
    } catch { errors.push(`${source}: missing target: ${href}`); }
  }
}

const manifests = [
  "packages/sdk", "packages/core", "packages/agents/strands", "packages/models/gemini",
  "packages/interoperability/mcp", "packages/retrieval/local",
];
const packagePaths = new Set<string>();
for (const directory of manifests) {
  const manifest = JSON.parse(await read(join(root, directory, "package.json"))) as { name: string; exports: Record<string, unknown> };
  for (const key of Object.keys(manifest.exports)) packagePaths.add(manifest.name + (key === "." ? "" : key.slice(1)));
}
let imports = 0;
for (const directory of [example, "packages/sdk/src"]) {
  for (const file of (await readdir(join(root, directory))).filter((name) => name.endsWith(".ts"))) {
    const source = ts.createSourceFile(file, await read(join(root, directory, file)), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if ((!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const specifier = node.moduleSpecifier.text;
      if (/packages\/core\/src|@arrokothi\/core\/src/.test(specifier)) errors.push(`${directory}/${file}: deep kernel import: ${specifier}`);
      if (!specifier.startsWith("@arrokothi/")) continue;
      imports++;
      if (!packagePaths.has(specifier)) errors.push(`${directory}/${file}: not a public export: ${specifier}`);
      if (!file.endsWith(".test.ts") && specifier === "@arrokothi/core/testing") errors.push(`${directory}/${file}: runtime starter imports test-only surface: ${specifier}`);
    }
  }
}
for (const file of ["app.ts", "patterns.ts", "classification.ts"]) {
  if (!(await read(join(root, example, file))).includes('from "@arrokothi/sdk"')) errors.push(`${example}/${file}: ordinary application must demonstrate SDK bootstrap`);
}
for (const file of ["AGENTS.md", ".agents/skills/arrokothi-agent-builder/SKILL.md", "README.md", `${guide}/README.md`]) {
  if (!(await read(join(root, file))).includes("@arrokothi/sdk")) errors.push(`${file}: missing SDK discovery route`);
}
const workspace = JSON.parse(await read(join(root, "package.json")));
const sdk = JSON.parse(await read(join(root, "packages/sdk/package.json")));
const core = JSON.parse(await read(join(root, "packages/core/package.json")));
const lock = JSON.parse(await read(join(root, "package-lock.json")));
if (!workspace.workspaces.includes("packages/sdk") || sdk.name !== "@arrokothi/sdk" || sdk.dependencies?.["@arrokothi/core"] !== core.version) errors.push("SDK workspace/name/core dependency is inconsistent");
if (lock.packages["packages/sdk"]?.version !== sdk.version || !lock.packages["node_modules/@arrokothi/sdk"]?.link) errors.push("SDK lockfile integration is missing");
if (!workspace.scripts.test.includes("packages/sdk/tests/") || !workspace.scripts["test:packages"].includes("packages/sdk/tests/")) errors.push("SDK tests are absent from standard suites");
for (const file of (await readdir(join(root, "packages/core/src"), { recursive: true })).filter(name => name.endsWith(".ts"))) {
  if ((await read(join(root, "packages/core/src", file))).includes("@arrokothi/sdk")) errors.push(`${file}: core must not depend on SDK`);
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Builder checks passed: ${sources.length} Markdown files, ${links} local links/anchors, ${imports} public package imports. Named symbols are checked by npm run typecheck.`);
}
