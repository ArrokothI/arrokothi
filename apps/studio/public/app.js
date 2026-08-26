/**
 * Studio UI. Vanilla ES modules, no framework, no build step.
 *
 * The definition object is the single source of truth: form editors mutate `current`, and the JSON
 * tab shows exactly what would be saved. Nothing here understands the agent loop - it only reads
 * and writes the JSON that core defines.
 */

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) node.append(child);
  return node;
};

const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: options.body ? { "content-type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  return body;
};

let current = blankDefinition();
let sessionId = null;
let lastTurn = null;

function blankDefinition() {
  return {
    id: "",
    version: 1,
    name: "",
    goal: "",
    description: "",
    model: { providerId: "gemini", model: "gemini-3.5-flash-lite", temperature: 0.2 },
    planning: { mode: "llm" },
    execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
    globalRules: [],
    knowledge: [],
    memorySchema: { fields: [] },
    hostContextSchema: { fields: [] },
    tools: [],
    policies: {
      maxSteps: 6,
      maxToolCallsPerTurn: 3,
      rejectUnknownMemoryFields: true,
      allowUnconfirmedSideEffects: false,
      transcriptWindow: 10,
      workingNoteTtlMs: 0,
      maxRetrievalRequests: 4,
      maxDocumentChunks: 4,
      maxRecordRows: 20,
      maxKnowledgeChars: 12000,
      maxAgentIterations: 8,
      maxKnowledgeCallsPerTurn: 12,
      maxActionRequestsPerTurn: 4,
      maxParallelReadCalls: 4,
    },
  };
}

// ── tabs ───────────────────────────────────────────────────────────────────
for (const nav of [$("config-tabs"), $("run-tabs")]) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    const scope = nav.parentElement;
    nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === button));
    scope.querySelectorAll(".tab-body > .tab").forEach((t) => t.classList.toggle("hidden", t.dataset.tab !== button.dataset.tab));
    if (button.dataset.tab === "json") $("f-json").value = JSON.stringify(readForm(), null, 2);
  });
}

// ── definition form ────────────────────────────────────────────────────────
function fillForm(def) {
  current = structuredClone(def);
  $("f-id").value = def.id ?? "";
  $("f-name").value = def.name ?? "";
  $("f-goal").value = def.goal ?? "";
  $("f-description").value = def.description ?? "";
  $("f-provider").value = def.model?.providerId ?? "";
  $("f-model").value = def.model?.model ?? "";
  $("f-temperature").value = def.model?.temperature ?? "";
  $("f-maxtokens").value = def.model?.maxOutputTokens ?? "";
  $("f-planner-mode").value = def.planning?.mode ?? "llm";
  $("f-harness").value = def.execution?.harness ?? "workflow";
  $("f-planner-provider").value = def.planning?.model?.providerId ?? "";
  $("f-planner-model").value = def.planning?.model?.model ?? "";
  $("f-rules").value = (def.globalRules ?? []).map((rule) =>
    typeof rule === "string" ? rule : `${rule.kind}:${rule.id}: ${rule.text}`,
  ).join("\n");
  $("f-maxsteps").value = def.policies?.maxSteps ?? 6;
  $("f-maxtools").value = def.policies?.maxToolCallsPerTurn ?? 3;
  $("f-window").value = def.policies?.transcriptWindow ?? 10;
  $("f-ttl").value = def.policies?.workingNoteTtlMs ?? 0;
  $("f-maxretrievals").value = def.policies?.maxRetrievalRequests ?? 4;
  $("f-maxchunks").value = def.policies?.maxDocumentChunks ?? 4;
  $("f-maxrows").value = def.policies?.maxRecordRows ?? 20;
  $("f-maxknowledgechars").value = def.policies?.maxKnowledgeChars ?? 12000;
  $("f-maxiterations").value = def.policies?.maxAgentIterations ?? 8;
  $("f-maxknowledgecalls").value = def.policies?.maxKnowledgeCallsPerTurn ?? 12;
  $("f-maxactions").value = def.policies?.maxActionRequestsPerTurn ?? 4;
  $("f-maxparallelreads").value = def.policies?.maxParallelReadCalls ?? 4;
  $("f-rejectunknown").checked = def.policies?.rejectUnknownMemoryFields !== false;
  $("f-allowunconfirmed").checked = def.policies?.allowUnconfirmedSideEffects === true;
  $("f-initial-phase").value = def.flow?.initialPhaseId ?? "";
  $("f-json").value = JSON.stringify(def, null, 2);
  renderMemory();
  renderContext();
  renderKnowledge();
  renderTools();
  renderPhases();
  renderMeta(def);
}

/** Reads scalar inputs back onto `current`. Collections are edited in place by their renderers. */
function readForm() {
  const num = (id) => ($(id).value === "" ? undefined : Number($(id).value));
  current.id = $("f-id").value.trim();
  current.name = $("f-name").value.trim();
  current.goal = $("f-goal").value.trim();
  current.description = $("f-description").value.trim() || undefined;
  current.model = {
    providerId: $("f-provider").value.trim(),
    model: $("f-model").value.trim(),
    temperature: num("f-temperature"),
    maxOutputTokens: num("f-maxtokens"),
  };
  const plannerProvider = $("f-planner-provider").value.trim();
  const plannerModel = $("f-planner-model").value.trim();
  current.planning = {
    mode: $("f-planner-mode").value,
    ...(plannerProvider && plannerModel ? { model: { providerId: plannerProvider, model: plannerModel, temperature: 0 } } : {}),
  };
  current.execution = { harness: $("f-harness").value, executionContextPolicy: "fresh_each_turn" };
  current.globalRules = $("f-rules").value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = /^(invariant|default):([^:]+):\s*(.+)$/.exec(line);
    return match ? { kind: match[1], id: match[2].trim(), text: match[3].trim() } : line;
  });
  current.policies = {
    maxSteps: num("f-maxsteps") ?? 6,
    maxToolCallsPerTurn: num("f-maxtools") ?? 3,
    transcriptWindow: num("f-window") ?? 10,
    workingNoteTtlMs: num("f-ttl") ?? 0,
    rejectUnknownMemoryFields: $("f-rejectunknown").checked,
    allowUnconfirmedSideEffects: $("f-allowunconfirmed").checked,
    maxRetrievalRequests: num("f-maxretrievals") ?? 4,
    maxDocumentChunks: num("f-maxchunks") ?? 4,
    maxRecordRows: num("f-maxrows") ?? 20,
    maxKnowledgeChars: num("f-maxknowledgechars") ?? 12000,
    maxAgentIterations: num("f-maxiterations") ?? 8,
    maxKnowledgeCallsPerTurn: num("f-maxknowledgecalls") ?? 12,
    maxActionRequestsPerTurn: num("f-maxactions") ?? 4,
    maxParallelReadCalls: num("f-maxparallelreads") ?? 4,
  };
  const initial = $("f-initial-phase").value.trim();
  if (current.flow?.phases?.length) current.flow.initialPhaseId = initial || current.flow.phases[0].id;
  else delete current.flow;
  return current;
}

function renderMeta(def) {
  const meta = $("definition-meta");
  meta.replaceChildren();
  if (!def.id) return;
  meta.append(el("span", { className: "badge", textContent: `v${def.version}` }));
  meta.append(el("span", { className: "muted mono", textContent: def.id }));
}

// ── collection editors ─────────────────────────────────────────────────────
const SCHEMA_KINDS = ["string", "number", "boolean", "enum", "string_array"];

function card(title, onRemove, body) {
  const head = el("div", { className: "card-head" }, [
    el("strong", { textContent: title }),
    el("button", { className: "tiny danger", textContent: "remove", onclick: onRemove }),
  ]);
  return el("div", { className: "card" }, [head, ...body]);
}

function field(labelText, input) {
  return el("label", { className: "grow", textContent: labelText }, [input]);
}

function textInput(value, onInput, placeholder = "") {
  return el("input", { value: value ?? "", placeholder, oninput: (e) => onInput(e.target.value) });
}

function selectInput(value, options, onChange) {
  const select = el("select", { onchange: (e) => onChange(e.target.value) });
  for (const option of options) select.append(el("option", { value: option, textContent: option, selected: option === value }));
  return select;
}

function renderMemory() {
  const host = $("memory-rows");
  host.replaceChildren();
  current.memorySchema.fields.forEach((f, i) => {
    const rows = [
      el("div", { className: "row" }, [
        field("key", textInput(f.key, (v) => (f.key = v))),
        field("type", selectInput(f.schema.kind, SCHEMA_KINDS, (v) => { f.schema = { kind: v, ...(v === "enum" ? { choices: [] } : {}) }; renderMemory(); })),
        field("authority", selectInput(f.authority ?? "authoritative", ["authoritative", "advisory"], (v) => (f.authority = v))),
      ]),
      el("div", { className: "row" }, [field("description", textInput(f.description, (v) => (f.description = v)))]),
    ];
    if (f.schema.kind === "enum") {
      rows.push(el("div", { className: "row" }, [
        field("choices (comma separated)", textInput((f.schema.choices ?? []).join(", "), (v) => (f.schema.choices = v.split(",").map((s) => s.trim()).filter(Boolean)))),
      ]));
    }
    if (f.schema.kind === "number") {
      rows.push(el("div", { className: "row" }, [
        field("min", textInput(f.schema.min ?? "", (v) => (f.schema.min = v === "" ? undefined : Number(v)))),
        field("max", textInput(f.schema.max ?? "", (v) => (f.schema.max = v === "" ? undefined : Number(v)))),
        el("label", { className: "check", textContent: "integer" }, [
          el("input", { type: "checkbox", checked: f.schema.integer === true, onchange: (e) => (f.schema.integer = e.target.checked) }),
        ]),
      ]));
    }
    host.append(card(f.key || `field ${i + 1}`, () => { current.memorySchema.fields.splice(i, 1); renderMemory(); }, rows));
  });
}

function renderContext() {
  const host = $("context-rows");
  host.replaceChildren();
  current.hostContextSchema.fields.forEach((f, i) => {
    const rows = [
      el("div", { className: "row" }, [
        field("key", textInput(f.key, (v) => (f.key = v))),
        field("type", selectInput(f.schema.kind, SCHEMA_KINDS, (v) => { f.schema = { kind: v, ...(v === "enum" ? { choices: [] } : {}) }; renderContext(); })),
      ]),
      el("div", { className: "row" }, [
        field("lifecycle", selectInput(f.lifecycle, ["fixed", "session", "turn"], (v) => (f.lifecycle = v))),
        field("visibility", selectInput(f.visibility, ["model", "tools_only", "runtime_only"], (v) => (f.visibility = v))),
        field("trust", selectInput(f.trust, ["trusted_host", "user_claimed", "tool_verified"], (v) => (f.trust = v))),
      ]),
      el("div", { className: "row" }, [field("description", textInput(f.description, (v) => (f.description = v)))]),
    ];
    host.append(card(f.key || `context ${i + 1}`, () => { current.hostContextSchema.fields.splice(i, 1); renderContext(); }, rows));
  });
}

function renderKnowledge() {
  const host = $("knowledge-rows");
  host.replaceChildren();
  current.knowledge.forEach((binding, i) => {
    const src = binding.source;
    const rows = [
      el("div", { className: "row" }, [
        field("id", textInput(src.id, (v) => (src.id = v))),
        field("title", textInput(src.title, (v) => (src.title = v))),
      ]),
      el("div", { className: "row" }, [field("planner description", textInput(src.description, (v) => (src.description = v)))]),
    ];
    if (src.kind === "document") {
      src.chunking ??= { chunkSize: 1000, chunkOverlap: 200 };
      rows.push(el("div", { className: "row" }, [
        field("chunk size", textInput(src.chunking.chunkSize ?? 1000, (v) => (src.chunking.chunkSize = Number(v)))),
        field("chunk overlap", textInput(src.chunking.chunkOverlap ?? 200, (v) => (src.chunking.chunkOverlap = Number(v)))),
      ]));
      rows.push(el("label", { textContent: "text" }, [
        el("textarea", { rows: 6, value: src.text ?? "", oninput: (e) => (src.text = e.target.value) }),
      ]));
    } else if (src.kind === "record_set") {
      rows.push(el("label", { textContent: "field types (JSON: {\"price\": {\"kind\": \"number\"}})" }, [
        el("textarea", { rows: 5, value: JSON.stringify(src.fields ?? {}, null, 2), onchange: (e) => tryJson(e.target, (v) => (src.fields = v)) }),
      ]));
      rows.push(el("label", { textContent: "records (JSON array)" }, [
        el("textarea", { rows: 8, value: JSON.stringify(src.records ?? [], null, 2), onchange: (e) => tryJson(e.target, (v) => (src.records = v)) }),
      ]));
      rows.push(el("label", { className: "check", textContent: "expose deterministic query tool to the model" }, [
        el("input", { type: "checkbox", checked: binding.exposeQueryTool !== false, onchange: (e) => (binding.exposeQueryTool = e.target.checked) }),
      ]));
    } else {
      rows.push(el("div", { className: "row" }, [
        field("allowed domains (comma separated; blank = public web)", textInput((src.allowedDomains ?? []).join(", "), (v) => {
          const list = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (list.length) src.allowedDomains = list; else delete src.allowedDomains;
        })),
      ]));
      rows.push(el("div", { className: "row" }, [
        field("blocked domains", textInput((src.blockedDomains ?? []).join(", "), (v) => {
          const list = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (list.length) src.blockedDomains = list; else delete src.blockedDomains;
        })),
        field("max results", textInput(src.maxResults ?? 5, (v) => (src.maxResults = Number(v)))),
      ]));
    }
    host.append(card(`${src.kind}: ${src.id || i}`, () => { current.knowledge.splice(i, 1); renderKnowledge(); }, rows));
  });
}

function renderTools() {
  const host = $("tool-rows");
  host.replaceChildren();
  current.tools.forEach((binding, i) => {
    const t = binding.definition;
    const rows = [
      el("div", { className: "row" }, [
        field("name", textInput(t.name, (v) => (t.name = v))),
        field("label", textInput(t.label, (v) => (t.label = v), "used in the confirmation prompt")),
      ]),
      el("div", { className: "row" }, [field("description", textInput(t.description, (v) => (t.description = v)))]),
      el("div", { className: "row" }, [
        field("effect", selectInput(t.effect, ["read", "write", "external_side_effect"], (v) => (t.effect = v))),
        field("confirmation", selectInput(t.confirmation, ["none", "required"], (v) => (t.confirmation = v))),
        field("idempotency", selectInput(t.idempotency, ["none", "per_input", "once_per_session"], (v) => (t.idempotency = v))),
      ]),
      el("label", { textContent: "input schema (JSON)" }, [
        el("textarea", { rows: 8, value: JSON.stringify(t.input ?? { kind: "object", fields: {} }, null, 2), onchange: (e) => tryJson(e.target, (v) => (t.input = v)) }),
      ]),
      el("label", { textContent: "argument source policies (JSON; required for side effects)" }, [
        el("textarea", { rows: 5, value: JSON.stringify(t.argumentPolicies ?? {}, null, 2), onchange: (e) => tryJson(e.target, (v) => (t.argumentPolicies = v)) }),
      ]),
      el("div", { className: "row" }, [
        el("span", { className: "muted", textContent: "dry-run outcome:" }),
        el("button", { className: "tiny", textContent: "succeed", onclick: () => setDryRun(t.name, "success") }),
        el("button", { className: "tiny", textContent: "fail", onclick: () => setDryRun(t.name, "failure") }),
      ]),
    ];
    host.append(card(t.name || `tool ${i + 1}`, () => { current.tools.splice(i, 1); renderTools(); }, rows));
  });
}

function renderPhases() {
  const host = $("phase-rows");
  host.replaceChildren();
  const phases = current.flow?.phases ?? [];
  phases.forEach((p, i) => {
    const rows = [
      el("div", { className: "row" }, [
        field("id", textInput(p.id, (v) => (p.id = v))),
        el("label", { className: "check", textContent: "terminal" }, [
          el("input", { type: "checkbox", checked: p.terminal === true, onchange: (e) => (p.terminal = e.target.checked) }),
        ]),
      ]),
      el("div", { className: "row" }, [field("objective", textInput(p.objective, (v) => (p.objective = v)))]),
      el("label", { textContent: "instructions" }, [
        el("textarea", { rows: 2, value: p.instructions ?? "", oninput: (e) => (p.instructions = e.target.value) }),
      ]),
      el("div", { className: "row" }, [
        field("tool scope (comma separated, blank = all)", textInput((p.toolNames ?? []).join(", "), (v) => {
          const list = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (v.trim() === "") delete p.toolNames; else p.toolNames = list;
        })),
      ]),
      el("div", { className: "row" }, [
        field("knowledge scope (comma separated, blank = all)", textInput((p.knowledgeSourceIds ?? []).join(", "), (v) => {
          const list = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (v.trim() === "") delete p.knowledgeSourceIds; else p.knowledgeSourceIds = list;
        })),
      ]),
      el("div", { className: "row" }, [
        field("override global default rule IDs", textInput((p.overrideRuleIds ?? []).join(", "), (v) => {
          const list = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (v.trim() === "") delete p.overrideRuleIds; else p.overrideRuleIds = list;
        })),
      ]),
      el("label", { textContent: "transitions (JSON array of {to, on, when, label})" }, [
        el("textarea", { rows: 6, value: JSON.stringify(p.transitions ?? [], null, 2), onchange: (e) => tryJson(e.target, (v) => (p.transitions = v)) }),
      ]),
    ];
    host.append(card(p.id || `phase ${i + 1}`, () => { phases.splice(i, 1); renderPhases(); }, rows));
  });
}

function tryJson(textarea, apply) {
  try {
    apply(JSON.parse(textarea.value));
    textarea.style.borderColor = "";
  } catch {
    textarea.style.borderColor = "var(--bad)";
  }
}

async function setDryRun(toolName, mode) {
  await api("/dry-run", { method: "POST", body: JSON.stringify({ toolName, mode }) });
  flash(`${toolName} dry run set to ${mode}`);
}

// ── buttons ────────────────────────────────────────────────────────────────
$("btn-add-memory").onclick = () => { current.memorySchema.fields.push({ key: "", schema: { kind: "string" } }); renderMemory(); };
$("btn-add-context").onclick = () => { current.hostContextSchema.fields.push({ key: "", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" }); renderContext(); };
$("btn-add-doc").onclick = () => { current.knowledge.push({ source: { id: "", kind: "document", title: "", description: "", text: "", chunking: { chunkSize: 1000, chunkOverlap: 200 } } }); renderKnowledge(); };
$("btn-add-records").onclick = () => { current.knowledge.push({ source: { id: "", kind: "record_set", title: "", fields: {}, records: [] } }); renderKnowledge(); };
$("btn-add-web").onclick = () => { current.knowledge.push({ source: { id: "web", kind: "web_search", title: "Public Web Search", description: "Current public web evidence.", maxResults: 5 } }); renderKnowledge(); };
$("btn-add-company").onclick = () => { current.knowledge.push({ source: { id: "company_site", kind: "web_search", title: "Company website", description: "Official company-site evidence only.", allowedDomains: ["example.com"], maxResults: 5 } }); renderKnowledge(); };
$("btn-add-tool").onclick = () => {
  current.tools.push({
    definition: { name: "", description: "", effect: "external_side_effect", confirmation: "required", idempotency: "once_per_session", argumentPolicies: {}, input: { kind: "object", fields: {} }, output: { kind: "object", additionalProperties: true, fields: {} } },
  });
  renderTools();
};
$("btn-add-phase").onclick = () => {
  current.flow ??= { initialPhaseId: "", phases: [] };
  current.flow.phases.push({ id: "", objective: "", transitions: [] });
  if (!current.flow.initialPhaseId) $("f-initial-phase").value = current.flow.phases[0].id;
  renderPhases();
};
$("btn-new").onclick = () => fillForm(blankDefinition());
$("btn-json-apply").onclick = () => {
  try {
    fillForm(JSON.parse($("f-json").value));
    flash("JSON applied");
  } catch (error) {
    flash(`invalid JSON: ${error.message}`, true);
  }
};
$("btn-export").onclick = () => {
  const json = JSON.stringify(readForm(), null, 2);
  navigator.clipboard?.writeText(json);
  $("f-json").value = json;
  flash("definition JSON copied to the clipboard");
};
$("btn-import").onclick = async () => {
  try {
    const body = await api("/definitions/import", { method: "POST", body: JSON.stringify({ json: $("f-json").value }) });
    await loadDefinitions(body.definition.id);
    flash(`imported ${body.definition.id} v${body.definition.version}`);
  } catch (error) {
    flash(error.message, true);
  }
};
$("btn-seed").onclick = async () => {
  const body = await api("/definitions/seed", { method: "POST" });
  await loadDefinitions();
  flash(body.seeded.length ? `seeded: ${body.seeded.join(", ")}` : "samples already present");
};
$("btn-save").onclick = async () => {
  try {
    const body = await api("/definitions", { method: "POST", body: JSON.stringify(readForm()) });
    await loadDefinitions(body.definition.id);
    flash(`saved ${body.definition.id} as v${body.definition.version}`);
  } catch (error) {
    flash(error.message, true);
  }
};

// ── definitions / sessions ─────────────────────────────────────────────────
async function loadDefinitions(selectId) {
  const list = await api("/definitions");
  const select = $("definition-list");
  select.replaceChildren();
  for (const def of list) {
    select.append(el("option", { value: def.id, textContent: `${def.name}  (${def.id} v${def.version})` }));
  }
  if (list.length) {
    select.value = selectId ?? list[0].id;
    await selectDefinition(select.value);
  }
}

async function selectDefinition(id) {
  const { definition, issues } = await api(`/definitions/${encodeURIComponent(id)}`);
  fillForm(definition);
  renderIssues(issues);
  await loadSessions();
}

$("definition-list").onchange = (e) => selectDefinition(e.target.value);

function renderIssues(issues = []) {
  const host = $("issues");
  host.replaceChildren();
  for (const issue of issues.slice(0, 6)) {
    host.append(el("div", { className: issue.severity, textContent: `${issue.severity}: ${issue.path} - ${issue.message}` }));
  }
}

async function loadSessions() {
  if (!current.id) return;
  const list = await api(`/sessions?agentId=${encodeURIComponent(current.id)}`);
  const select = $("session-list");
  select.replaceChildren(el("option", { value: "", textContent: list.length ? "— pick a session —" : "— no sessions yet —" }));
  for (const s of list) {
    select.append(el("option", { value: s.sessionId, textContent: `${s.sessionId.slice(0, 16)}  v${s.agentVersion}  ${s.updatedAt.slice(11, 19)}` }));
  }
  if (sessionId && list.some((s) => s.sessionId === sessionId)) select.value = sessionId;
}

$("session-list").onchange = async (e) => {
  sessionId = e.target.value || null;
  $("transcript").replaceChildren();
  if (sessionId) await refreshSession();
};

$("btn-new-session").onclick = async () => {
  if (!current.id) return flash("save a definition first", true);
  const body = await api("/sessions", { method: "POST", body: JSON.stringify({ agentId: current.id }) });
  sessionId = body.sessionId;
  $("transcript").replaceChildren();
  await loadSessions();
  $("session-list").value = sessionId;
  await refreshSession();
  flash(`session ${sessionId.slice(0, 16)} started on v${body.agentVersion}`);
};

// ── chat ───────────────────────────────────────────────────────────────────
$("btn-send").onclick = send;
$("f-message").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

async function send() {
  const message = $("f-message").value.trim();
  if (!message) return;
  if (!sessionId) return flash("start a session first", true);

  appendMessage("user", message);
  $("f-message").value = "";
  const button = $("btn-send");
  button.disabled = true;
  button.textContent = "…";

  try {
    lastTurn = await api(`/sessions/${encodeURIComponent(sessionId)}/turn`, {
      method: "POST",
      body: JSON.stringify({ message, hostContext: $("f-hostcontext").value }),
    });
    const calls = lastTurn.metrics
      ? ` · calls=${lastTurn.metrics.totalModelCalls} (preflight ${lastTurn.metrics.preflightModelCalls}, loop ${lastTurn.metrics.agentLoopModelCalls}, summary ${lastTurn.metrics.conversationSummaryModelCalls}, guide ${lastTurn.metrics.guideRetryModelCalls})`
      : "";
    appendMessage("assistant", lastTurn.reply, `stop=${lastTurn.stopReason} · steps=${lastTurn.steps} · phase=${lastTurn.state.phaseId ?? "none"}${calls}`);
    renderState(lastTurn.state, lastTurn.dryRunLedger);
    renderTrace(lastTurn.events);
    renderPrompts(lastTurn.contexts);
  } catch (error) {
    appendMessage("assistant", `[studio error] ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Send";
  }
}

$("btn-observe-context").onclick = async () => {
  if (!sessionId) return flash("start a session first", true);
  try {
    const raw = $("f-hostcontext").value.trim();
    const hostContext = raw ? JSON.parse(raw) : {};
    const result = await api(`/sessions/${encodeURIComponent(sessionId)}/context`, {
      method: "POST",
      body: JSON.stringify({ hostContext }),
    });
    renderState(result.state);
    const { events } = await api(`/sessions/${encodeURIComponent(sessionId)}/events`);
    renderTrace(events);
    flash(`Host Context observed without a model call (${result.observation.accepted.length} accepted)`);
  } catch (error) {
    flash(error.message, true);
  }
};

function appendMessage(role, text, meta) {
  const node = el("div", { className: `msg ${role}` }, [document.createTextNode(text)]);
  if (meta) node.append(el("span", { className: "meta", textContent: meta }));
  $("transcript").append(node);
  $("transcript").scrollTop = $("transcript").scrollHeight;
}

async function refreshSession() {
  const body = await api(`/sessions/${encodeURIComponent(sessionId)}/state`);
  $("transcript").replaceChildren();
  for (const entry of body.state.transcript) appendMessage(entry.role, entry.text);
  renderState(body.state, body.dryRunLedger);
  const { events } = await api(`/sessions/${encodeURIComponent(sessionId)}/events`);
  renderTrace(events);
  renderPrompts(body.contexts ?? []);
}

// ── panels ─────────────────────────────────────────────────────────────────
function table(headers, rows) {
  const head = el("tr", {}, headers.map((h) => el("th", { textContent: h })));
  const body = rows.map((cells) => el("tr", {}, cells.map((c) => (c instanceof Node ? el("td", {}, [c]) : el("td", { className: "mono", textContent: String(c) })))));
  return el("table", {}, [el("thead", {}, [head]), el("tbody", {}, body)]);
}

function section(title, node) {
  return el("div", {}, [el("h3", { textContent: title }), node]);
}

function renderState(state, dryRunLedger = []) {
  const host = $("state-view");
  host.replaceChildren();

  const memory = Object.values(state.memory);
  host.append(section("Structured memory", memory.length
    ? table(["field", "value", "mechanism", "origin", "source events", "turn", "note"], memory.map((m) => [
        m.key,
        JSON.stringify(m.value),
        m.writeMechanism,
        m.provenance?.kind,
        (m.provenance?.sourceEventIds ?? []).join(", "),
        m.turn,
        [m.normalized ? "normalized" : "", m.previousValue !== undefined ? `was ${JSON.stringify(m.previousValue)}` : "", m.authority === "advisory" ? "advisory" : ""].filter(Boolean).join(" · "),
      ]))
    : el("div", { className: "empty", textContent: "nothing committed yet" })));

  host.append(section("Preflight plan", state.turnPlan
    ? el("pre", { textContent: JSON.stringify(state.turnPlan, null, 2) })
    : el("div", { className: "empty", textContent: "no plan for this turn" })));

  host.append(section("Retrieval trace", state.turnRetrievals?.length
    ? table(["source", "kind", "returned", "result ids", "error"], state.turnRetrievals.map((r) => [
        r.sourceId, r.request.kind, r.returnedCount, r.resultIds.join(", "), r.error?.message ?? "",
      ]))
    : el("div", { className: "empty", textContent: "no retrieval operations" })));

  host.append(section("Working memory (non-authoritative)", state.workingNotes.length
    ? table(["note", "turn"], state.workingNotes.map((n) => [n.text, n.turn]))
    : el("div", { className: "empty", textContent: "no working notes" })));

  host.append(section("Host context", Object.values(state.hostContext).length
    ? table(["key", "value", "lifecycle", "visibility", "trust"], Object.values(state.hostContext).map((c) => [
        c.key, JSON.stringify(c.value), c.lifecycle, c.visibility, c.trust,
      ]))
    : el("div", { className: "empty", textContent: "no host context supplied" })));

  const phase = el("div", { className: "mono", textContent: state.phaseId ?? "(no flow configured)" });
  host.append(section("Phase", phase));

  host.append(section("Pending action", state.pendingAction
    ? table(["request", "tool", "arguments", "asked on turn"], [[
        state.pendingAction.requestId,
        state.pendingAction.toolName,
        JSON.stringify(state.pendingAction.args),
        state.pendingAction.turn,
      ]])
    : el("div", { className: "empty", textContent: "none outstanding" })));

  const ledgerRows = Object.values(state.ledger);
  host.append(section("Action ledger (idempotency keys)", ledgerRows.length
    ? table(["key", "tool", "turn", "result"], ledgerRows.map((e) => [e.key, e.toolName, e.turn, e.result.ok ? "ok" : "failed"]))
    : el("div", { className: "empty", textContent: "no actions executed" })));

  host.append(section("Dry-run dispatches", dryRunLedger.length
    ? table(["tool", "turn", "outcome", "payload"], dryRunLedger.map((r) => [r.toolName, r.turn, r.outcome, JSON.stringify(r.args)]))
    : el("div", { className: "empty", textContent: "nothing dispatched" })));
}

const EVENT_CLASS = {
  MemoryWriteCommitted: "commit",
  MemoryWriteRejected: "reject",
  ToolCallRejected: "reject",
  ToolExecutionSucceeded: "action",
  ToolExecutionFailed: "error",
  ToolExecutionStarted: "action",
  ToolRequested: "action",
  ConfirmationRequested: "confirm",
  ConfirmationResolved: "confirm",
  RuntimeError: "error",
  PhaseTransitioned: "confirm",
  TurnPlanCreated: "confirm",
  KnowledgeRetrieved: "action",
  RetrievalRequestRejected: "reject",
  AgentIterationStarted: "confirm",
  AgentIterationCompleted: "confirm",
  ExecutionLifecycleObserved: "confirm",
  DelegationRequested: "action",
  DelegationCompleted: "action",
  DelegationRejected: "reject",
};

function describeEvent(event) {
  const p = event.payload ?? {};
  switch (event.type) {
    case "UserMessageReceived": return p.text;
    case "AssistantMessageEmitted": return `${p.text}\n(stop: ${p.stopReason})`;
    case "MemoryWriteProposed": return `${p.key} = ${JSON.stringify(p.value)}`;
    case "MemoryWriteCommitted": return `${p.key} = ${JSON.stringify(p.value)}${p.previousValue !== undefined ? ` (was ${JSON.stringify(p.previousValue)})` : ""}`;
    case "MemoryWriteRejected": return `${p.key} = ${JSON.stringify(p.value)}\nREJECTED (${p.code}): ${p.reason}`;
    case "HostContextObserved": return `accepted: ${p.accepted.map((a) => a.key).join(", ") || "none"}${p.rejected.length ? `\nrejected: ${p.rejected.map((r) => `${r.key} (${r.reason})`).join(", ")}` : ""}`;
    case "SemanticSignalsObserved": return p.signals.join(", ");
    case "TurnPlanCreated": return `${p.strategy} -> ${p.resolvedBy}${p.detail ? `\n${p.detail}` : ""}\n${JSON.stringify(p.plan, null, 2)}`;
    case "KnowledgeRetrieved": return `${p.request.kind} · ${p.sourceId} · ${p.returnedCount} result(s)\nids: ${p.resultIds.join(", ")}${p.scores?.length ? `\nscores: ${p.scores.join(", ")}` : ""}`;
    case "RetrievalRequestRejected": return `${p.request.kind} · ${p.request.sourceId}\nREJECTED (${p.error.code}): ${p.error.message}`;
    case "AgentIterationStarted": return `${p.harness} · iteration ${p.iteration} · phase ${p.phaseId ?? "none"}\ncapabilities: ${p.capabilityNames.join(", ") || "none"}`;
    case "AgentIterationCompleted": return `${p.harness} · iteration ${p.iteration} · requested ${p.requested} · completed ${p.completed} · rejected ${p.rejected}${p.stopReason ? ` · stop=${p.stopReason}` : ""}`;
    case "ExecutionLifecycleObserved": return `${p.engine} · ${p.event}${p.iteration ? ` · iteration ${p.iteration}` : ""}${p.capabilityName ? ` · ${p.capabilityName}` : ""}${p.detail ? `\n${JSON.stringify(p.detail)}` : ""}`;
    case "DelegationRequested": return `${p.category} · ${p.capabilityName}(${JSON.stringify(p.input)}) · iteration ${p.iteration}`;
    case "DelegationCompleted": return `${p.category} · ${p.capabilityName} · ${p.outcome}\n${JSON.stringify(p.summary).slice(0, 500)}`;
    case "DelegationRejected": return `${p.category} · ${p.capabilityName}\nREJECTED (${p.code}): ${p.reason}`;
    case "PhaseTransitioned": return `${p.from ?? "(start)"} -> ${p.to}  [${p.on}]${p.label ? ` · ${p.label}` : ""}`;
    case "ToolRequested": return `${p.toolName}(${JSON.stringify(p.args)})  by ${p.requestedBy}`;
    case "ToolCallRejected": return `${p.toolName} REFUSED (${p.reason})\n${p.message}`;
    case "ConfirmationRequested": return `${p.toolName} · request ${p.requestId}\npayload: ${JSON.stringify(p.args)}`;
    case "ConfirmationResolved": return `${p.requestId} -> ${p.decision.toUpperCase()} [rule: ${p.rule}]\n${p.reason}`;
    case "ToolExecutionStarted": return `${p.toolName} (key ${p.idempotencyKey})`;
    case "ToolExecutionSucceeded": return `${p.toolName} SUCCEEDED${p.replayed ? " (replayed - not re-executed)" : ""}\n${JSON.stringify(p.output).slice(0, 400)}`;
    case "ToolExecutionFailed": return `${p.toolName} FAILED: ${p.error.code} - ${p.error.message}`;
    case "ModelCallCompleted": return `${p.purpose} · ${p.providerId}/${p.model}${p.usage?.outputTokens ? ` · ${p.usage.outputTokens} out` : ""}`;
    case "RuntimeError": return `${p.code}: ${p.message}${p.detail ? `\n${p.detail}` : ""}`;
    case "WorkingNoteRecorded": return p.note.text;
    default: return JSON.stringify(p).slice(0, 300);
  }
}

function renderTrace(events) {
  const host = $("trace-view");
  host.replaceChildren();
  if (!events?.length) return host.append(el("div", { className: "empty", textContent: "no events yet" }));
  for (const event of events) {
    host.append(el("div", { className: `event ${EVENT_CLASS[event.type] ?? ""}` }, [
      el("div", {}, [
        el("span", { className: "type", textContent: event.type }),
        el("span", { className: "muted", textContent: `  #${event.seq} · turn ${event.turn} · ${event.at.slice(11, 19)}` }),
      ]),
      el("div", { className: "detail", textContent: describeEvent(event) }),
    ]));
  }
}

function renderPrompts(contexts) {
  const host = $("prompt-view");
  host.replaceChildren();
  if (!contexts?.length) return host.append(el("div", { className: "empty", textContent: "send a turn to see the compiled context" }));
  for (const { purpose, context } of contexts) {
    host.append(el("h3", { textContent: `${purpose} · ${context.approxChars} chars · phase ${context.phaseId ?? "none"}` }));
    if (context.withheldContextKeys.length) {
      host.append(el("div", { className: "muted", textContent: `withheld from the model: ${context.withheldContextKeys.map((w) => `${w.key} (${w.visibility})`).join(", ")}` }));
    }
    if (context.knowledgeUsed.length) {
      host.append(el("div", { className: "muted", textContent: `retrieved evidence: ${context.knowledgeUsed.map((item) => `${item.sourceId}${item.chunkId ? `/${item.chunkId}` : ""}${item.score !== undefined ? ` score=${item.score}` : ""}`).join(", ")}` }));
    }
    if (context.effectiveRules?.length) {
      host.append(el("div", { className: "muted", textContent: `effective rules: ${context.effectiveRules.map((rule) => `${rule.id} (${rule.kind})`).join(", ")}` }));
    }
    host.append(el("pre", { textContent: context.system }));
  }
}

$("btn-send").disabled = false;

function flash(message, bad = false) {
  const host = $("issues");
  host.replaceChildren(el("div", { className: bad ? "error" : "muted", textContent: message }));
}

// ── boot ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    const status = await api("/status");
    $("status").replaceChildren(
      el("span", { className: `dot ${status.provider.mode === "gemini" ? "live" : "offline"}` }),
      document.createTextNode(`${status.provider.detail} · ${status.database.split("/").slice(-1)[0]}`),
    );
    await loadDefinitions();
    if (!status.definitionCount) flash("no definitions yet - press “Seed samples” to load the bundled examples");
  } catch (error) {
    $("status").textContent = `error: ${error.message}`;
  }
})();
