# Context, Tools, and Skills

Agent quality depends heavily on what the model can perceive and how it can act. Anthropic's engineering work treats context design and tool design as first-class parts of the agent architecture.

## 1. Context engineering is broader than prompt engineering

Prompt engineering focuses on instructions.

Context engineering asks a wider question:

> Which tokens should be present for this inference so the model is most likely to take the desired next action?

Potential context includes:

```text
context
├── system instructions
├── user messages
├── conversation history
├── tool definitions
├── tool results
├── retrieved documents
├── memory
├── environment state
├── skill instructions
└── generated working notes
```

The context window is a scarce working resource, not a database.

The guiding objective is:

```text
smallest useful working set
+ highest signal
+ enough information for the next decision
```

More context is not automatically better. Irrelevant or stale material can make tool selection and reasoning worse while increasing cost.

## 2. Use just-in-time context

Instead of loading all potentially relevant information before reasoning begins, keep lightweight references and retrieve details when needed.

Examples of references:

- file paths,
- URLs,
- query handles,
- object names,
- timestamps,
- compact metadata.

The loop becomes:

```text
see lightweight index
        |
        v
decide what matters
        |
        v
load targeted detail
        |
        v
make next decision
```

This provides progressive disclosure: each retrieval reveals information that guides the next retrieval.

The tradeoff is runtime exploration cost. Just-in-time retrieval can be slower, and the agent needs tools and heuristics that help it navigate effectively. Hybrid designs are often useful: preload small, stable, high-value instructions and discover the rest on demand.

## 3. Compaction and context clearing

Long traces accumulate stale tool results, redundant reasoning, and superseded instructions.

Compaction summarizes an older context and starts a new window from a smaller representation.

Use compaction to preserve:

- decisions that still constrain future work;
- unresolved problems;
- important implementation state;
- remaining objectives;
- critical observations.

Prefer discarding or trimming:

- redundant tool outputs;
- repeated discussion;
- old intermediate data that can be re-fetched;
- superseded attempts.

Compaction is lossy. If future steps may need the original record, retain it outside the active context and make it retrievable.

A useful separation is:

```text
durable record
    |
    +--> selected / compacted working context
```

Do not treat the active context window as the only source of history.

## 4. Structured note-taking

Agents can externalize working memory to persistent notes.

Examples:

- task lists,
- progress logs,
- decisions,
- unresolved questions,
- discovered constraints,
- references to important artifacts.

This is especially useful when many tool calls or context resets separate discovery from later use.

Notes should be treated as curated state, not a transcript dump. The goal is to preserve information with future decision value.

## 5. Tools are an Agent-Computer Interface

A tool exposed to an agent is not just a programmatic API endpoint. It is part of the model's action vocabulary.

Design it for the model's affordances.

### 5.1 Prefer semantic tools over endpoint mirrors

A common mistake is to wrap every existing API operation directly.

Instead, ask:

- What task boundary is natural for an agent?
- What information would a human need to choose this action?
- Can the tool perform low-level filtering or transformation before returning data?
- Does this tool reduce or increase context burden?

More tools can make the system worse if they overlap or create ambiguous choices.

### 5.2 Give every tool a distinct purpose

Overlapping tools increase selection errors.

Good tool sets make the action space easy to partition:

```text
search issues
read issue
update issue
```

is easier to reason about than many vaguely differentiated wrappers around generic HTTP operations.

### 5.3 Namespace related tools

When many services or resources are present, names should help the model infer boundaries.

Examples:

```text
github_search_code
github_read_issue
slack_search_messages
slack_post_message
```

The exact naming convention should be evaluated with the target model. Naming is behavioral interface design.

### 5.4 Return high-signal results

Tool outputs enter context, so output shape matters.

Prefer:

- human-readable names;
- semantically meaningful fields;
- concise summaries;
- relevant excerpts;
- pagination or filters;
- next-step hints when truncating.

Avoid forcing the model to read:

- large unfiltered collections;
- irrelevant metadata;
- opaque identifiers when meaningful labels are available;
- raw tracebacks when an actionable error can be returned.

### 5.5 Make errors instructional

An error result should help the agent repair the next call.

Useful errors explain:

- what was invalid;
- what the valid shape is;
- which parameter needs changing;
- whether the agent should narrow, paginate, retry, or choose another tool.

### 5.6 Treat tool descriptions as prompts

Tool names, descriptions, parameter docs, examples, and schemas all steer model behavior.

Describe a tool as if onboarding a capable new teammate who lacks your implicit domain knowledge.

Make explicit:

- intended use;
- non-use cases;
- parameter semantics;
- domain terminology;
- resource relationships;
- expected output;
- important constraints.

Then evaluate tool use empirically.

## 6. Scale large tool libraries through discovery

Loading hundreds or thousands of full tool definitions into context wastes tokens before the task begins.

Anthropic's later tool-use work applies progressive disclosure to the tool surface itself:

```text
small tool index / search
        |
        v
discover relevant tool
        |
        v
load detailed schema
        |
        v
invoke
```

A discovery mechanism can expose different levels of detail:

1. name;
2. name + description;
3. full schema and examples.

This preserves a large capability catalog without forcing the model to reason over all definitions at once.

## 7. Use code for orchestration when code is the better control language

Natural-language agent loops are not always the best place for:

- loops,
- conditionals,
- joins,
- aggregation,
- retries,
- data filtering.

When the agent can write code in a secure execution environment, it can call tools programmatically and return only the relevant result to the model.

```text
model writes orchestration code
        |
        v
code calls several tools
        |
        v
code filters / joins / aggregates
        |
        v
small result enters model context
```

Benefits include:

- fewer inference round trips;
- less intermediate data in context;
- explicit control flow;
- easier filtering of large datasets;
- possible privacy benefits when sensitive intermediate values never need to enter model context.

The cost is a more demanding security and execution environment. Agent-generated code requires sandboxing, resource limits, and monitoring.

## 8. Skills package procedural knowledge

Anthropic's Agent Skills pattern packages domain knowledge as discoverable files and resources.

A skill is conceptually:

```text
skill
├── lightweight metadata
├── core instructions
├── optional reference files
├── scripts
└── resources
```

The important design principle is progressive disclosure.

At startup, load only enough metadata to let the agent recognize relevance. If the skill is selected, load its core instructions. If a specialized branch is needed, load additional files only then.

This allows a large body of procedural knowledge without permanently consuming the context window.

### Skill design heuristics

- Make the skill's purpose obvious from its metadata.
- Keep the core instructions lean.
- Split mutually exclusive or rarely co-needed material into separate files.
- Make it clear whether scripts are meant to be executed or read as reference.
- Include validation steps or quality criteria where useful.
- Preserve model judgment where the task cannot be reduced to a rigid procedure.

A skill is knowledge and procedure available to an agent; it is not automatically a separate agent.

## 9. MCP belongs at the interoperability layer

Model Context Protocol standardizes connection to external tools and data, but MCP by itself does not define the full agent architecture.

As tool ecosystems grow, the engineering questions become:

```text
discovery
-> projection into context
-> invocation
-> execution
-> result shaping
```

The transport or protocol is only one part of that chain.

A large MCP catalog should therefore not imply a large always-loaded model tool surface.

## 10. Context and tool checklist

Before adding information or a tool:

- Does the model need this for the next decision?
- Can it be represented as a lightweight reference until needed?
- Can the underlying program filter or aggregate the data first?
- Is the tool's purpose distinct from every neighboring tool?
- Are the name and description sufficient for correct selection?
- Are errors actionable?
- Can old tool results be cleared after their information has been incorporated?
- Should durable information be externalized to notes or a session record?
- Does code execution reduce inference and context cost enough to justify its security overhead?
- Has the tool or context strategy been evaluated on realistic agent tasks?
