import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition, CompiledContext, ModelProvider, WebSearchProvider } from "@agent-sdk/core";
import {
  AgentRuntime,
  AgentHarness,
  KnowledgeIndex,
  NativeAgentHarness,
  ReferenceLoopEngine,
  ToolRegistry,
  createRandomIds,
  createSystemClock,
  defineAgent,
  definitionHash,
  deserializeDefinition,
  nextVersion,
  validateDefinition,
} from "@agent-sdk/core";
import { StaticModelProvider } from "@agent-sdk/core/testing";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import { ClaudeAgentHarness } from "@agent-sdk/provider-claude-agent";
import { createStrandsGeminiEngine } from "@agent-sdk/integration-strands";
import { SqliteDefinitionStore, SqliteSessionStore, openDatabase } from "./sqlite-store.ts";
import { DryRunRegistry, registerStudioExecutors } from "./executors.ts";
import { SAMPLE_DEFINITIONS } from "./samples.ts";

/**
 * The Studio: a deliberately small development server.
 *
 * Zero dependencies - `node:http` for the API, `node:sqlite` for storage, and a vanilla SPA for the
 * UI. This is a documented deviation from "a small Next.js app is acceptable": the boundary the
 * brief actually protects is that the database and UI live OUTSIDE core behind a store adapter, and
 * that is exactly what this is. Nothing here is imported by the kernel.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");
const DATA_DIR = process.env["STUDIO_DATA_DIR"] ?? join(HERE, "..", "data");
const DB_PATH = process.env["STUDIO_DB"] ?? join(DATA_DIR, "studio.sqlite");
const PORT = Number(process.env["PORT"] ?? 4321);
const WEB_SEARCH_ENDPOINT = process.env["STUDIO_WEB_SEARCH_ENDPOINT"];

mkdirSync(DATA_DIR, { recursive: true });
const db = openDatabase(DB_PATH);
const definitions = new SqliteDefinitionStore(db);
const sessions = new SqliteSessionStore(db);
const dryRun = new DryRunRegistry();

/** Compiled contexts, kept in memory per session so the trace viewer can show the actual prompts. */
const contextLog = new Map<string, { turn: number; purpose: string; context: CompiledContext }[]>();

/**
 * Model provider selection.
 *
 * With a key, real Gemini. Without one, an offline echo provider - clearly labelled as such in the
 * UI and in the trace, so nobody mistakes plumbing for model behaviour.
 */
function buildProvider(apiKey: string | undefined): { provider: ModelProvider; mode: "gemini" | "offline"; detail: string } {
  if (apiKey) {
    const model = process.env["STUDIO_MODEL"] ?? "gemini-3.5-flash-lite";
    return { provider: new GeminiProvider({ apiKey, model }), mode: "gemini", detail: `Gemini (${model})` };
  }
  return {
    provider: new StaticModelProvider("[offline echo] No model provider is configured, so this reply is a placeholder. Set GEMINI_API_KEY and restart to use a real model."),
    mode: "offline",
    detail: "offline echo - set GEMINI_API_KEY to use a real model",
  };
}

const studioGeminiApiKey = geminiApiKeyFromEnv();
const { provider, mode: providerMode, detail: providerDetail } = buildProvider(studioGeminiApiKey);

function buildWebSearchProvider(): WebSearchProvider | undefined {
  if (!WEB_SEARCH_ENDPOINT) return undefined;
  return {
    async search(request) {
      const response = await fetch(WEB_SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env["STUDIO_WEB_SEARCH_TOKEN"] ? { authorization: `Bearer ${process.env["STUDIO_WEB_SEARCH_TOKEN"]}` } : {}),
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`Studio web search endpoint returned HTTP ${response.status}`);
      const value = await response.json() as { query?: string; results?: unknown[] };
      if (!Array.isArray(value.results)) throw new Error("Studio web search endpoint returned no results array");
      return { query: value.query ?? request.query, results: value.results as never };
    },
  };
}

const webSearch = buildWebSearchProvider();

function buildRuntime(
  definition: AgentDefinition,
  onContextCompiled?: (context: CompiledContext, purpose: string) => void,
): AgentRuntime {
  const knowledge = new KnowledgeIndex(definition.knowledge, { webSearch });
  const tools = registerStudioExecutors(new ToolRegistry(definition.tools), definition, knowledge, dryRun);
  const harness = definition.execution?.harness === "native_agent"
    ? new NativeAgentHarness()
    : definition.execution?.harness === "claude_agent"
      ? new ClaudeAgentHarness({ executionContextPolicy: "fresh_each_turn" })
      : definition.execution?.harness === "workflow" || definition.execution?.harness === "two_pass"
        ? new AgentHarness({ strategy: "workflow" })
        : new AgentHarness({
            engine: studioGeminiApiKey
              ? createStrandsGeminiEngine({ apiKey: studioGeminiApiKey })
              : new ReferenceLoopEngine(),
          });
  return new AgentRuntime({
    definition,
    sessions,
    model: provider,
    tools,
    knowledge,
    harness,
    ids: createRandomIds(),
    clock: createSystemClock(),
    onContextCompiled,
  });
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

const json = (res: ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
};

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "request body is not valid JSON");
  }
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
};

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  // Path traversal guard: the resolved path must stay inside PUBLIC_DIR.
  const target = join(PUBLIC_DIR, relative);
  if (!target.startsWith(PUBLIC_DIR)) throw new HttpError(403, "forbidden");
  try {
    const body = await readFile(target);
    res.writeHead(200, { "content-type": MIME[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    throw new HttpError(404, `not found: ${pathname}`);
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const path = url.pathname.replace(/^\/api/, "");
  const method = req.method ?? "GET";
  const segments = path.split("/").filter(Boolean);

  // GET /api/status
  if (method === "GET" && path === "/status") {
    return json(res, 200, {
      provider: { id: provider.id, mode: providerMode, detail: providerDetail },
      harnesses: {
        primary: "AgentHarness",
        agenticEngine: studioGeminiApiKey ? "StrandsLoopEngine" : "ReferenceLoopEngine (offline)",
        claudeConfigured: !!process.env["ANTHROPIC_API_KEY"],
        webSearchConfigured: !!webSearch,
      },
      database: DB_PATH,
      definitionCount: (await definitions.listLatest()).length,
    });
  }

  // ---- definitions --------------------------------------------------------
  if (segments[0] === "definitions") {
    // GET /api/definitions
    if (method === "GET" && segments.length === 1) {
      const all = await definitions.listLatest();
      return json(res, 200, all.map((d) => ({ ...d, hash: definitionHash(d), issues: validateDefinition(d) })));
    }

    // POST /api/definitions  - save as a NEW version (or v1 if new)
    if (method === "POST" && segments.length === 1) {
      const body = await readBody(req);
      const incoming = defineAgent(body as never);
      const existing = await definitions.get(incoming.id);
      const { id: _id, version: _version, ...changes } = incoming;
      const toSave = existing ? nextVersion(existing, changes) : incoming;
      const errors = validateDefinition(toSave).filter((i) => i.severity === "error");
      if (errors.length) return json(res, 400, { error: "definition has errors", issues: errors });
      await definitions.save(toSave);
      return json(res, 200, { definition: toSave, hash: definitionHash(toSave) });
    }

    // POST /api/definitions/import
    if (method === "POST" && segments[1] === "import") {
      const body = await readBody(req);
      const raw = typeof body["json"] === "string" ? (body["json"] as string) : JSON.stringify(body["definition"] ?? body);
      const imported = deserializeDefinition(raw);
      const existing = await definitions.get(imported.id);
      const { id: _importedId, version: _importedVersion, ...importedChanges } = imported;
      const toSave = existing ? nextVersion(existing, importedChanges) : { ...imported, version: 1 };
      const errors = validateDefinition(toSave).filter((i) => i.severity === "error");
      if (errors.length) return json(res, 400, { error: "imported definition has errors", issues: errors });
      await definitions.save(toSave);
      return json(res, 200, { definition: toSave });
    }

    // POST /api/definitions/seed - load the bundled samples
    if (method === "POST" && segments[1] === "seed") {
      const saved: string[] = [];
      for (const sample of SAMPLE_DEFINITIONS) {
        if (await definitions.get(sample.id)) continue;
        await definitions.save(sample);
        saved.push(sample.id);
      }
      return json(res, 200, { seeded: saved });
    }

    const id = segments[1];
    if (!id) throw new HttpError(400, "definition id is required");

    // GET /api/definitions/:id/versions
    if (method === "GET" && segments[2] === "versions") {
      return json(res, 200, { versions: await definitions.listVersions(id) });
    }

    // GET /api/definitions/:id[?version=]
    if (method === "GET" && segments.length === 2) {
      const versionParam = url.searchParams.get("version");
      const definition = await definitions.get(id, versionParam ? Number(versionParam) : undefined);
      if (!definition) throw new HttpError(404, `unknown definition "${id}"`);
      return json(res, 200, { definition, hash: definitionHash(definition), issues: validateDefinition(definition) });
    }

    // DELETE /api/definitions/:id
    if (method === "DELETE" && segments.length === 2) {
      await definitions.delete?.(id);
      return json(res, 200, { deleted: id });
    }
  }

  // ---- sessions -----------------------------------------------------------
  if (segments[0] === "sessions") {
    // GET /api/sessions?agentId=
    if (method === "GET" && segments.length === 1) {
      const agentId = url.searchParams.get("agentId") ?? undefined;
      return json(res, 200, await sessions.listSessions(agentId));
    }

    // POST /api/sessions { agentId, version?, label? }
    if (method === "POST" && segments.length === 1) {
      const body = await readBody(req);
      const agentId = String(body["agentId"] ?? "");
      const definition = await definitions.get(agentId, body["version"] ? Number(body["version"]) : undefined);
      if (!definition) throw new HttpError(404, `unknown definition "${agentId}"`);
      const runtime = buildRuntime(definition);
      const sessionId = await runtime.createSession(undefined, body["label"] ? String(body["label"]) : undefined);
      return json(res, 200, { sessionId, agentId: definition.id, agentVersion: definition.version });
    }

    const sessionId = segments[1];
    if (!sessionId) throw new HttpError(400, "session id is required");
    const record = await sessions.getSession(sessionId);
    if (!record) throw new HttpError(404, `unknown session "${sessionId}"`);
    const definition = await definitions.get(record.agentId, record.agentVersion);
    if (!definition) throw new HttpError(404, `session references a definition that no longer exists`);

    // GET /api/sessions/:id/state
    if (method === "GET" && segments[2] === "state") {
      const runtime = buildRuntime(definition);
      const state = await runtime.loadState(sessionId);
      return json(res, 200, {
        state,
        definition: { id: definition.id, version: definition.version, name: definition.name },
        dryRunLedger: dryRun.recordsFor(sessionId),
        contexts: contextLog.get(sessionId) ?? [],
      });
    }

    // GET /api/sessions/:id/events
    if (method === "GET" && segments[2] === "events") {
      return json(res, 200, { events: await sessions.readEvents(sessionId) });
    }

    // POST /api/sessions/:id/turn { message, hostContext? }
    if (method === "POST" && segments[2] === "turn") {
      const body = await readBody(req);
      const message = String(body["message"] ?? "").trim();
      if (!message) throw new HttpError(400, "message is required");

      let hostContext: Record<string, unknown> | undefined;
      const rawContext = body["hostContext"];
      if (typeof rawContext === "string" && rawContext.trim()) {
        try {
          hostContext = JSON.parse(rawContext) as Record<string, unknown>;
        } catch {
          throw new HttpError(400, "hostContext is not valid JSON");
        }
      } else if (rawContext && typeof rawContext === "object") {
        hostContext = rawContext as Record<string, unknown>;
      }

      const captured: { turn: number; purpose: string; context: CompiledContext }[] = [];
      const runtime = buildRuntime(definition, (context, purpose) => captured.push({ turn: 0, purpose, context }));
      const result = await runtime.runTurn({ sessionId, message, hostContext });

      const log = contextLog.get(sessionId) ?? [];
      log.push(...captured.map((c) => ({ ...c, turn: result.state.turn })));
      contextLog.set(sessionId, log.slice(-40));

      return json(res, 200, {
        reply: result.reply,
        stopReason: result.stopReason,
        steps: result.steps,
        metrics: result.metrics,
        state: result.state,
        events: result.events,
        contexts: captured,
        dryRunLedger: dryRun.recordsFor(sessionId),
      });
    }

    // POST /api/sessions/:id/context { hostContext } - observation only; no model call.
    if (method === "POST" && segments[2] === "context") {
      const body = await readBody(req);
      const rawContext = body["hostContext"] ?? body;
      if (!rawContext || typeof rawContext !== "object" || Array.isArray(rawContext)) {
        throw new HttpError(400, "hostContext must be a JSON object");
      }
      const runtime = buildRuntime(definition);
      const result = await runtime.observeHostContext({ sessionId, hostContext: rawContext as Record<string, unknown> });
      return json(res, 200, result);
    }

    // DELETE /api/sessions/:id
    if (method === "DELETE" && segments.length === 2) {
      await sessions.deleteSession?.(sessionId);
      contextLog.delete(sessionId);
      return json(res, 200, { deleted: sessionId });
    }
  }

  // ---- dry-run controls ---------------------------------------------------
  if (segments[0] === "dry-run" && method === "POST") {
    const body = await readBody(req);
    const toolName = String(body["toolName"] ?? "");
    const modeValue = body["mode"] === "failure" ? "failure" : "success";
    if (!toolName) throw new HttpError(400, "toolName is required");
    dryRun.setMode(toolName, modeValue);
    return json(res, 200, { toolName, mode: modeValue });
  }

  throw new HttpError(404, `no API route for ${method} ${url.pathname}`);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const handler = url.pathname.startsWith("/api") ? handleApi(req, res, url) : serveStatic(res, url.pathname);
  handler.catch((error: unknown) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (status === 500) console.error("[studio]", error);
    if (!res.headersSent) json(res, status, { error: message });
    else res.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n  Agent SDK Studio`);
  console.log(`  ----------------`);
  console.log(`  url       http://localhost:${PORT}`);
  console.log(`  database  ${DB_PATH}`);
  console.log(`  provider  ${providerDetail}`);
  console.log(`\n  Tools run as DRY RUNS. No external side effect is ever performed.\n`);
});
