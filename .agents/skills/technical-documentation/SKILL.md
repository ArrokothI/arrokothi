---
name: technical-documentation
description: >-
  Write, rewrite, or review ArrokothI technical documentation for understanding or
  lookup while preserving its contracts. Use for explanatory concept pages,
  architecture reference, API documentation, tutorials, and how-to guides.
  Not for routine code changes or artifact layout in Word/PDF files.
---

# Technical documentation

Make the document useful for its intended reader without changing what the system
promises. Explanatory architecture pages are a supported outcome; brevity is not a
substitute for understanding.

## Establish the job and its sources

Use the request and existing document to identify the audience, assumed knowledge,
and question being answered. Ask only when a consequential gap remains. Distinguish
explanation (understand relationships and reasons), reference (look up exact facts),
tutorial (guided first success), and how-to (complete a task). Depth and length do
not determine the document type.

For architecture, follow the canonical-owner routing in
[arrokothi-architecture](../arrokothi-architecture/SKILL.md). Read the relevant owners
and interacting contracts, not the entire architecture on every edit. For API or
procedural documentation, check the actual public surface and executable examples;
target contracts do not establish available APIs.

For the ongoing concept rewrite, consult the scope and page queue in
[the working index](../../../mental-model/rewrite-index.md). Read its open-choice
inventory and historical evidence only for the topic at hand. The index and draft
files are not substitutes for canonical sources.

## Rewrite with a semantic baseline

Before changing prose, identify the definitions, obligations, permissions,
conditions, exceptions, owners, and deliberately open choices it must preserve.
Keep this comparison proportional to the change; a small edit needs no separate
report or permanent inventory.

Introduce unfamiliar concepts in a useful dependency order. Give enough local
context to follow the explanation, with links for prerequisites or deeper rules.
Keep definitions findable even in a narrative page. Use examples when they resolve
a specific misunderstanding; do not require a rationale or example for every term.

Treat new explanatory assertions as claims needing support. In particular:

- Preserve qualifiers such as "Kernel", "mediated", "required", and "under this
  operating profile". Optional facilities can still have mandatory boundary rules.
- Do not turn a possible example into a universal property, a chosen implementation
  into a portable contract, or missing evidence into evidence of absence.
- Distinguish recorded design rationale from an illustrative consequence. Do not
  invent incidents or rejected alternatives to make the narrative persuasive.
- Do not settle an open design choice during a prose rewrite. Flag a substantive
  ambiguity or proposed semantic change separately under the architecture process.
- Keep specification, implementation, and acceptance status in their designated
  homes. Preserve links, useful examples, and stable anchors where possible.

For reference, use consistent fields or tables where they improve lookup; ordered
algorithms and minimal examples are appropriate. For explanation, develop the
relationships and consequences the reader needs. Do not impose word counts,
paragraph quotas, or a rule that every page must be self-contained.

## Verify meaning and usefulness separately

Compare the rewrite against its source contracts for omissions, stronger or weaker
claims, changed ownership, and assumptions introduced by examples. Then check the
reader's task: can they explain the relevant distinction, find the exact rule, or
complete the documented procedure? A fluent or understandable passage can still be
incorrect. Fresh-reader feedback is useful for substantial rewrites when available;
do not claim it occurred when only self-review was performed.

Check changed links and anchors. Run documented examples when implementation claims
depend on them; a prose-only edit does not require unrelated implementation tests.
Report substantive uncertainties and distinguish editorial changes from proposed
contract changes. Do not publish, start a roadmap packet, or rewrite adjacent pages
merely because the documentation points to them.

For deeper craft guidance, read the relevant sections of the
[writing study](../../../mental-model/writing-craft-study.md), especially definition
versus explanation, rationale, links, and semantic preservation. It is supporting
guidance rather than a required full-context preamble.
