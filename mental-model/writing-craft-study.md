# A Study of Technical Writing Craft, for Rewriting Difficult Architecture Documentation

This study supports explanatory architecture writing and precise reference writing.
Both correctness and comprehension need deliberate review: a rewrite can make a
page easier to read while accidentally changing its promises. The current ArrokothI
concept rewrite is intended to remain explanatory. It does not have to converge on
a terse glossary to be successful.

The reusable workflow lives in
[the technical-documentation skill](../.agents/skills/technical-documentation/SKILL.md).
This longer study supplies reasoning and examples; consult the relevant sections
rather than loading it in full for every writing or coding task. The
[rewrite index](rewrite-index.md) tracks this project's queue and open questions.
Neither this study nor its examples defines ArrokothI semantics.

## Sources and interpretation

The main sources are [Diátaxis reference](https://diataxis.fr/reference/),
[Diátaxis explanation](https://diataxis.fr/explanation/), and
[Google Technical Writing](https://developers.google.com/tech-writing).
Google's [organizing large documents](https://developers.google.com/tech-writing/two/large-docs)
and [API reference comments](https://developers.google.com/style/api-reference-comments)
are useful for navigation and implemented API documentation respectively.

These are sources of writing principles, not a single combined standard. The
judgments and examples below are this repository's synthesis, not quotations or
universal requirements endorsed by those sources. No third-party skill is copied,
installed, or vendored here. Generic Job/Worker examples are hypothetical and fix no
ArrokothI contract; an ArrokothI example must be checked against its canonical owner.

Use §1 for purpose, §§2–10 for sequencing and examples, §§11–17 for prose and links,
§18 for reference structure, and §§19–21 for review and preservation of meaning.
Numerical writing heuristics are prompts to inspect a passage, not pass/fail limits
or claims about a universal cognitive threshold.

## 1. Four reader needs, independent of document length

Diátaxis distinguishes documentation by the reader's purpose:

- **Tutorial:** learn by doing through a reliable path to a first success. Explain
  enough to orient the learner and defer digressions that interrupt the exercise.
- **How-to guide:** accomplish a task with assumed baseline competence. Include
  prerequisites, decisions, and cautions needed to do it correctly.
- **Reference:** consult exact facts about a defined surface: definitions,
  obligations, parameters, algorithms, limits, or errors. Organize for lookup.
- **Explanation:** understand a topic through its relationships, context, examples,
  consequences, and supported rationale. Organize for a developing mental model.

These purposes do not prescribe four directories, four lengths, or a mechanical
ban on particular words. A reference algorithm can say "first" and "then"; a
how-to can explain why a prerequisite matters. The useful test is whether material
serves the reader's current question or interrupts it with a different task.

Architecture depth is a separate dimension. ArrokothI's Layer 1/2/3 division says
how much detail a page covers and where contracts are owned. It does not require
Layer 3 to be terse. An explanatory concept page can carry a precise definition
and develop its meaning through examples, as long as readers can distinguish the
contract from the illustrative scenario.

### Connecting explanation and reference

A reader learning why a boundary matters needs a sequence of ideas. A reader
checking its exact behavior needs a stable location and sufficient conditions and
exceptions. Support both through clear sections and links. If long explanation
buries lookup, separate the treatments rather than compressing away either need.

Each rule still needs one canonical owner. An explanatory summary may restate it
briefly and link to its full contract; it must preserve the rule's qualifications.
If reference ownership is later moved outside `mental-model/`, transfer it
explicitly. A new directory or a shorter copy does not establish precedence.

The [rewrite index's reference proposal](rewrite-index.md#6-possible-later-reference-split-proposal)
records a possible future arrangement. Current concept and mechanism ownership
continues until that arrangement is deliberately adopted.

## 2. How a reader builds a mental model of a complex system

A reader does not absorb a document fact by fact into a flat list. They build a
structure — a mental model — in which each new fact is a slot filled in relative to
other facts, and each new named entity is a node that needs at least a provisional
place before it can hold any properties. This has three concrete consequences for
architecture writing.

First, **a reader can only extend a structure they already have**. The very first
sentence that mentions a new concept is disproportionately important, because it is
the one that determines what kind of slot the reader creates for it — is this a
type of *thing*, a *process*, a *guarantee*, a *role*? If the first sentence is
ambiguous about that (a common failure: naming something and immediately using it in
a relative clause before saying what category it belongs to), the reader either
guesses wrong and has to repair the model later — costly — or defers judgment and
carries an open question forward, which consumes attention on everything they read
afterward.

Second, **working memory is small**. A reader can hold only a handful of unresolved,
not-yet-connected items in mind before earlier ones start to fall out. A sentence or
paragraph that introduces four new proper nouns and asserts a relationship among all
of them in one breath is not "dense," in the good sense — it is asking the reader to
juggle more balls than a working memory can hold, so something gets dropped, and the
reader has to re-read. This is the mechanical, almost physiological version of "the
document is overly compressed": compression that respects working-memory limits
feels efficient; compression that exceeds them feels exhausting, even if every
individual sentence is true and well-formed.

Third, **an unmotivated concept is structurally unstable**. If a reader is told that
a thing exists and how it behaves, but never why it needed to exist, they can encode
its rules as a rote list, but they cannot use that list to predict the thing's
behavior in a case the document didn't spell out — because prediction requires a
model of the underlying problem the thing is solving, not just a list of its
observed properties. This is why explanation of motivation is not decoration on top
of correctness; it is what turns a memorized rule into a rule the reader can extend
on their own, which is the entire point of documenting an architecture rather than
just an API surface.

The practical upshot: good architecture writing manages the reader's evolving model
of the system deliberately, sentence by sentence — introducing one new node at a
time, giving it a place before giving it relationships, and periodically restating
where a piece fits in the whole (an orienting sentence at the top of a section, e.g.
"this section describes how the Reconciler decides which Job to retry, one layer
below the retry policy just described") rather than assuming the reader is
silently maintaining a perfect map that the writer never had to draw.

## 3. Introducing an abstraction before relying on it

For an unfamiliar abstraction, establish its category and purpose before asking
the reader to reason about its relationships. A short first-use gloss often does
this well. Terms explicitly assumed as prerequisites need not be reintroduced;
reference entries may link to their canonical definitions. Choose the order of
name, category, and example that makes this particular concept understandable.

Consider:

> Bad: "When a Ledger commit fails, the Reconciler retries it according to the
> Watchdog's backoff policy."

This sentence is entirely correct and would be perfectly fine reference prose for a
reader who already has *Ledger*, *Reconciler*, and *Watchdog* installed as known
entities. For a first encounter, it introduces three unexplained proper nouns and
asserts two relationships among them in a single clause — exactly the overload
described in §2.

> Better: "A Ledger commit is the durable record of one Job's outcome. If a commit
> fails, the system must decide whether to retry — that decision belongs to a
> component called the Reconciler. The Reconciler consults a per-Job retry policy,
> enforced by the Watchdog, before retrying."

This costs more words, but it introduces one entity, gives it a place, and only then
lets the reader watch it interact with the next entity. Once all three terms have
been anchored once in a document (or in the reference entry the reader is assumed to
have seen), the terse form from the "bad" example becomes exactly the right level of
compression — density is earned, not assumed.

The debt metaphor is useful here: using an unintroduced term is a *forward reference*
the reader has to carry as an open question ("what is a Watchdog? I'll find out
later, I guess") until it's resolved. A document that does this more than once or
twice compounds the debt, and the reader's attention goes increasingly to bookkeeping
open questions rather than to understanding the sentence in front of them. The fix is
almost never "explain less" — it's "sequence correctly": say things in the order the
reader needs them, which is a stronger and different constraint than merely saying
all of them somewhere.

## 4. Definition, invariant, and explanation

A **definition** identifies what a term denotes and distinguishes it from nearby
terms. An **invariant** states a property that must hold within a specified scope.
An **explanation** helps the reader understand a relationship, consequence, or
reason. They can support the same concept without doing the same job.

In a hypothetical scheduler:

> Definition: A Job is a unit of work independently tracked by the scheduler.
>
> Invariant: While a Job is assigned, the scheduler records one current owning
> Worker for it.
>
> Explanation: The ownership record identifies whose result the scheduler may
> accept. Two Workers might still be physically running after a disconnection;
> preventing both from mutating external state requires a separate mechanism.

The invariant is checkable, but it does not by itself define Job or establish
exclusive physical execution. The explanation helps the reader apply the rule
without silently strengthening it. This distinction matters especially when an
architecture describes accepted state alongside native work it does not control.

Give a concept enough explanation for the reader's task. A field name may need
only a definition and a valid example. A surprising ownership boundary may need a
scenario and its consequences. Neither requires inventing a historical incident
or attaching a mandatory rationale paragraph to every term.

## 5. Explain reasons without inventing them

Explain why when it resolves a real question for the intended audience. A design
trade-off is often useful, but even an apparently obvious consequence may need
explanation for a newcomer. Judge what the reader knows rather than what the writer
finds self-evident.

Distinguish three kinds of statement:

- **Recorded rationale:** a decision record establishes why an alternative was
  chosen or rejected. Cite that record when the history matters.
- **Illustrative consequence:** a hypothetical case shows what a rule permits or
  prevents. Present it as an example, not as the historical cause of the design.
- **Unknown rationale:** the contract is established but its original reason is
  unavailable. Describe the supported behavior and leave the history unstated.

For example, a hypothetical bounded queue that drops its oldest entry preserves
newer entries at the expense of older work. That consequence follows from the
policy. A claim that the policy was introduced after a retry incident needs separate
evidence. A claim that it prevents starvation would require stronger assumptions.

An explanation can be useful without naming a rejected alternative. Show a
relationship or concrete implication when that answers the question better. If a
reader asks for motivation and the sources do not establish it, mark the uncertainty
rather than making the prose sound more certain than the evidence.

## 6. When examples help, and how they should be chosen

An example's job is to convert a proposition the reader can recite into an instance
they can recognize. This is often valuable at two moments: the first time an
abstraction is introduced (so the category has a concrete member, not just a
definition), and any time a stated rule has a non-obvious edge (so the reader sees
the edge exercised rather than merely asserted).

Choosing an example well means choosing the *smallest* instance that still crosses
the boundary the surrounding prose just drew — not the most realistic or most
featureful instance. A common failure is illustrating a rule with a comfortable
happy-path example that never actually exercises the distinction the prose claims to
be making:

> Bad: to illustrate that a Job retains its Worker assignment across a transient
> network blip, the example shows a Job completing normally with no blip at all.

> Better: the example shows the blip occurring mid-Job, the Worker reconnecting, and
> the assignment surviving — the one case that actually demonstrates the claim.

A second discipline: reuse one running example across a document rather than
inventing a fresh scenario for every illustration. A reader who has to learn a new
cast of characters for each example spends attention on the fiction instead of the
point; a reader who already knows "the Job that's being retried" from three
paragraphs ago can focus entirely on what's new this time.

In reference documentation specifically, examples must stay illustrative rather than
becoming instructional — an example shows the *shape* of correct usage (a single
valid call, a single valid record). A multi-step example can still illustrate a
reference contract. Move it to a how-to when its purpose becomes guiding a separate
task rather than clarifying the entry being consulted (see §18).

## 7. Contrast and counterexamples

A counterexample helps when the reader is likely to apply a familiar but incorrect
model. State the positive meaning first, then use a specific contrast to clarify
the boundary. Repeated "not X" paragraphs can make readers learn unnecessary
alternatives before they understand the subject.

For ArrokothI, an appropriate distinction is that the Kernel rejects an obsolete
attempt's Outcome while the Driver must separately establish safe native
continuation. A stale host can remain alive and capable of mutation. The
[native recovery contract](mechanisms/recovery.md#decide-permission-before-replacing-work)
owns that distinction; Activation scoping alone does not prevent native-session
resumption.

An earlier version of this study used a counterexample implying that Activation
scoping supplied that prevention. It was incorrect: the explanatory sentence
quietly added an enforcement guarantee. Examples deserve the same semantic review
as definitions.

Historical counterexamples need documented history. Hypothetical counterexamples
need explicit assumptions and should be described as possibilities rather than
incidents that actually happened. Prefer the smallest case that exposes the
relevant distinction.

## 8. Prerequisite ordering

A document, or a set of documents, has an implicit dependency graph over its
concepts: term B's full meaning depends on term A having already been established.
Good architecture writing makes that graph explicit to itself before writing a word,
and then honors it — which is a stronger requirement than merely defining every term
*somewhere*.

For an unfamiliar term, ask whether its meaning depends on something introduced
later. Possible resolutions include moving the dependency earlier, declaring it as
a prerequisite, giving a pointer and a short gloss ("a Runtime, the component that
performs the work, reports back with an Outcome"), or restructuring the
document so the dependency is not needed yet. Avoid assuming unstated background
knowledge that the intended reader has no reason to possess.

The one-line gloss deserves emphasis as a technique: it is not a second, weaker
definition competing with a canonical one elsewhere — it is a cheap, disposable
placeholder that lets the current sentence be understood *now*, with the full
treatment linked for whenever the reader wants it. A brief gloss can save the reader
from stopping to look something up mid-thought or reading on with an unresolved gap.

## 9. Progressive disclosure

Complex systems have to be revealed in layers, and different readers legitimately
need to stop at different layers. A useful three-layer model for architecture
documentation:

- **Orientation layer**: what this thing is and why it exists, in roughly a
  paragraph. A reader who stops here should have a correct, if incomplete, mental
  model — not a wrong one waiting to be corrected later.
- **Operational layer**: the reference-grade detail of how it actually behaves —
  states, transitions, guarantees, required call order, limits.
- **Edge-case layer**: exceptions, failure modes, and interactions with other parts
  of the system that only matter once the reader is already deep in operational
  detail.

The discipline this implies is that a document (or a section) should not force every
reader through all three layers to get anything at all — a reader who only needs
orientation should be able to stop after the first paragraph with a true belief, not
a simplified lie they'll have to unlearn. This also governs when to split documents
rather than merge them: two audiences needing different layers of the same subsystem
is a reason to split by layer, even though the subject matter is "the same"; two
different subsystems needing the same layer is often a better reason to keep
material together than subject-matter proximity alone.

Heading discipline follows from the same idea: a heading is a promise about what
layer the reader is about to enter, and a document should not jump from a broad,
orientation-level heading straight into a narrow operational sub-point without one
bridging sentence that tells the reader why this narrow point lives here, under this
broader heading, rather than somewhere else.

## 10. Information density

Judge density by how much unfamiliar information a reader must connect at once.
A short sentence can be difficult if all its nouns are new; a longer sentence can
be easy if it connects familiar ideas. Several unfamiliar entities combined with
nested conditions are a reason to inspect the passage, not an automatic failure.

Try introducing a dependency earlier, separating an exception, or using a table
when the reader would otherwise need to reread the sentence. Preserve a relationship
in one sentence when splitting it would obscure the connection. Counting nouns or
clauses can draw attention to a problem, but cannot establish comprehension.

## 11. Paragraph structure

Give each paragraph a coherent purpose. An opening sentence that names the main
point helps readers scan; subsequent sentences can develop it through definition,
reason, example, or qualification. Those functions can belong together when they
explain the same idea. Separate a new topic rather than enforcing one grammatical
claim per paragraph.

For instance, a paragraph can define a checkpoint, show an immutable checkpoint
reference, and explain why a mutable session identifier does not offer the same
guarantee. The example and distinction support the definition. A separate discussion
of retention policy may deserve its own paragraph or section.

Length is a diagnostic, not a quota. Split a paragraph when its reader has to hold
unrelated questions at once; keep it together when splitting would sever a useful
connection. Short definitions, longer explanatory paragraphs, and tables can all be
appropriate within one page. Do not pad paragraphs to three sentences or split them
solely because they exceed a fixed count.

## 12. Sentence structure

Three habits are useful, applied with judgment. Definitions naturally use "is";
there is no benefit in replacing an accurate verb merely to make it sound active.

**Prefer active voice with a named actor.** In architecture prose specifically,
passive voice is not just a style question — it is very often the mechanism by
which a sentence avoids saying who is responsible for something, which is exactly
the ambiguity that causes the largest arguments about a system later ("who handles
this?").

> Bad: "Retries are throttled after three consecutive failures."
> Better: "The Watchdog throttles retries after three consecutive failures."

The second version identifies responsibility, provided the source contract really
assigns it to the Watchdog. A writer must verify the actor rather than invent one
to eliminate passive voice. Passive voice remains useful when the actor is unknown
or irrelevant to the statement.

**Use a specific verb when it clarifies behavior.** Replacing a nominalized action
can make responsibility easier to see. Keep ordinary definition verbs when they
already state the meaning directly.

> Bad: "Failure detection is performed by the Watchdog through periodic heartbeat
> checks."
> Better: "The Watchdog detects failure by checking heartbeats periodically."

**Keep one idea per sentence, and convert embedded enumeration into real lists.**
A sentence joined by "and," a relative clause introduced by "which," or a semicolon
holding two independent technical claims is a strong signal to split — or, if the
items are genuinely parallel, to lift them into an actual bulleted or numbered list
rather than leaving them buried in prose:

> Dense: "In this example, the Reconciler reassigns a Job after a Worker crash,
> marks it permanently failed for malformed input, and retries it once after a
> deadline before marking it failed if that retry also fails."
>
> Easier to scan: "In this example, the Reconciler responds to three cases:
>
> - the Worker crashed — the Job is reassigned to a new Worker;
> - the input was malformed — the Job is marked permanently failed;
> - the Job exceeded its deadline — the Job is retried once, then marked failed
>   if that retry also fails."

The list preserves the example's behavior. Reformatting must not introduce a new
retry policy or imply these are every possible cause of failure.

Finally, resolve pronouns aggressively. In prose already carrying two or three
technical nouns, a bare "it" a few clauses later is a common, avoidable source of
the reader having to stop and figure out which noun it refers to — repeat the noun
instead, even at the cost of a little variety, because variety is not a value in
reference prose the way precision is.

## 13. Terminology

A damaging habit in architecture documentation is introducing a
synonym for stylistic variety — calling the same concept a "Job" in one paragraph
and a "task" or "unit of work" in the next, meaning no difference at all. A reader
encountering a new word has no way to know, on first read, whether it names a new
concept or is just a different word for one they already have; every synonym is
therefore a small tax the reader pays to find out, by re-reading, that nothing new
was actually said. Use the canonical term consistently. Explicitly defined
shorthands, such as Execution Runtime and Runtime, are useful; unexplained stylistic
synonyms create uncertainty about whether a second concept exists.

Terms should be defined once, prominently, at or very near first use, and that
definition should be easy to find again later (a glossary, or a canonical reference
entry linked consistently) rather than requiring the reader to recall which of
several earlier paragraphs first mentioned it. When a term is reintroduced after a
long gap in the document, a short parenthetical reminder of its meaning costs little
and prevents the reader from having to search backward.

Borrowing a term from a similar technology elsewhere is risky specifically because
it imports the reader's existing associations along with the word — if those
associations don't map precisely onto the new usage, the borrowed term actively
misleads rather than merely under-informing. Explain relevant differences without
renaming established concepts during a prose rewrite. A new name is an architecture
and terminology decision with its own migration cost. Where confusion is likely,
state which familiar properties apply and which do not — the contrast technique
from §7 applied to terminology.

## 14. Cross-document links

A page should deliver what it promises to its intended audience. Links can provide
optional depth, identify necessary prerequisites, or incorporate a separately owned
contract. These are different purposes; make the destination and reason clear.

An explanation should not require an unexpected detour to understand its central
point. A short local gloss can keep the narrative moving. A reference page may
legitimately require another definition or standard to determine exact behavior;
copying that entire contract locally would create maintenance risk.

> Weak explanation: The Reconciler uses the standard merge semantics (see link).
>
> Better, if supported by the hypothetical contract: The Reconciler keeps the
> update with the later timestamp and uses Worker ID to break a tie. The linked
> merge specification defines the timestamp comparison and tie ordering.

The second passage explains the broad behavior while making the remaining
normative dependency explicit. It need not reproduce the complete specification
or imply that all links are optional.

Check whether a reader who has the declared prerequisites can follow the page's
main argument. Then check that exact lookup leads to the right owner. Anchor text
should identify what the destination contributes, such as a definition, algorithm,
failure case, or next procedure.

## 15. Repetition versus necessary local explanation

Not all repetition is waste. There is a sharp difference between **lazy
repetition** — copy-pasting the same paragraph of explanation into multiple
documents, which then silently diverges the first time one copy is updated and the
other isn't — and **anchoring repetition** — a short, deliberate
reminder of a prerequisite concept, placed exactly where it's used again after a
gap, that costs almost nothing and saves the reader a trip elsewhere.

The failure mode of forcing a reader to hold several other documents in mind
simultaneously just to parse the current sentence is not solved by writing longer,
self-contained documents that duplicate everything — that just relocates the
maintenance cost onto keeping duplicates in sync, which reliably fails over time.
It's solved by using the one-line gloss technique from §8 consistently: repeat the
*minimum* restatement that makes the current sentence self-sufficient, and link to
the canonical, single source of the full treatment for anyone who needs more. The
canonical source should remain identifiable. Repeated glosses also need to preserve
its qualifications and be revisited when the underlying rule changes.

## 16. When detail improves comprehension rather than adding noise

Detail earns its place when it answers a question the reader has already been led
to ask, or will predictably ask at exactly this point (an edge case, a boundary
condition, a "what happens if this fails mid-way" the surrounding prose just raised
the possibility of). Detail becomes noise when it answers a question the reader
hasn't yet formed — often because it's inserted, parenthetically, into a sentence
that is in the middle of establishing something else entirely, so the reader has to
suspend the main claim to process an aside about a case they weren't yet thinking
about.

A working test before adding any detail: state, in one clause, what question this
detail answers. If that question can't be articulated, the detail is very likely
noise and should be cut. If the question is real but premature at this point in the
document, the detail should be *moved* — to a dedicated edge-case subsection (see
the layering in §9) — rather than either cut entirely or left where it currently
interrupts a different point.

## 17. Avoiding technically precise but cognitively exhausting prose

Precision and readability are not opposite ends of one dial — they are different
axes, and the most common way architecture writers accidentally trade the second
for the first is by trying to make one sentence carry both a general rule and every
exception to it, in the name of completeness.

> Exhausting-but-precise: "A Job is retried up to three times, except when it fails
> due to malformed input, in which case it is not retried at all, unless the
> malformed-input detector itself is degraded, in which case the normal retry limit
> applies."

Every clause here is true. The sentence is nonetheless exhausting, because the
reader has to hold three conditions and their interactions simultaneously before
they can extract the one fact that mattered to them right now.

> Same facts, separated by role:
> "A Job is retried up to three times.
> Exception: a Job that fails due to malformed input is not retried.
> Exception to the exception: if the malformed-input detector is itself degraded,
> the normal three-retry limit applies instead."

Nothing was simplified or made less precise — the facts are identical. What changed
is that the general rule is now available as a single clean sentence a skimming
reader can extract, and each exception is its own unit the reader processes only if
they need it. This is the practical meaning of "avoid cognitively exhausting prose
without sacrificing precision": separate the rule from its exceptions structurally,
rather than compressing both into one grammatically correct but cognitively
overloaded sentence.

## 18. Reference depth and predictable lookup

Reference depth means covering the documented surface accurately: its definitions,
conditions, guarantees, exceptions, limits, and failures. Concise reference omits
unneeded narrative, not obligations. An exact contract may be longer than an
introductory explanation.

Use structure that matches the subject. A concept entry may need definition,
owner, scope, and related mechanisms. A protocol operation may need preconditions,
accepted changes, retry behavior, and refusal cases. An encoding contract may need
an ordered algorithm and a limits table. Do not force empty template fields onto
subjects that do not have them.

Sequencing words do not determine document type. "First validate the value, then
encode the captured snapshot" can specify a required algorithm. "First install the
package, then build your first application" guides a learner through a task. Judge
the purpose and context, not whether the word "then" appears.

Minimal usage examples belong in reference when they clarify the contract. Extended
walkthroughs can live in guides with links back to exact behavior. Likewise, a
reference can briefly explain a parameter's consequence without developing a full
history of the design.

API reference has an additional dependency: the actual implemented surface. Verify
signatures, defaults, returns, errors, and behavior against code and relevant tests.
Generated types help keep spelling accurate; they do not establish retry safety or
explain what a returned receipt proves. Target architecture prose must not be used
to invent a public signature.

## 19. Common failure modes in architecture documentation

Use these diagnostics when a passage is difficult to understand; they are not
mechanical requirements for every paragraph. Pair them with the semantic checks
in §21:

- **Unmotivated concept**: a term or component appears with a definition but no
  answer to why it exists, when it's load-bearing enough that the reader needs to
  extend its behavior to cases the document didn't spell out (§4, §5).
- **Definition doing explanation's job**: a one-line, technically complete
  definition is left to stand in for the motivating context a concept actually needs
  (§4).
- **Passive voice hiding ownership**: "X is handled," "Y is throttled," with no
  named actor — usually concealing exactly the "who is responsible for this"
  question a reader will eventually need answered (§12).
- **Synonym drift**: the same concept referred to by two or more different names
  across a document, forcing the reader to verify, every time, whether a new word is
  a new concept (§13).
- **Links substituting for owed explanation**: a sentence that cannot be understood
  without an unexpected detour, despite the page promising to explain that point.
  Explicit prerequisites and normative reference dependencies are different (§14).
- **Prerequisite inversion**: a term used before it has been anchored, forcing the
  reader to carry an unresolved forward reference (§3, §8).
- **Narrative obscuring reference**: a task walkthrough or long digression hides
  the exact rule being consulted; ordered algorithms themselves are appropriate (§18).
- **Reference bleeding into explanation or opinion**: argument for why a design is
  better mixed directly into a statement of what the design *is*, with no
  typographic or structural separation (§1).
- **Flat, uniform density**: every sentence written at maximum precision and
  qualification regardless of how important the point is, so a reader cannot tell
  which sentences matter most (§9, §10, §17).
- **Unmarked audience or layer shift**: a document that moves from orientation-level
  material to deep operational or edge-case detail without a signal, so a reader who
  only needed the first layer is dragged through the rest anyway (§9).
- **Explanation that never resolves**: a discursive "why" section that discusses
  history and trade-offs but never connects back to a concrete, checkable rule the
  reader can use — explanation that stays permanently abstract instead of eventually
  cashing out in something reference can state plainly (§1, §5).

## 20. Synthesis: mental-model-first documentation

Every principle above reduces to one underlying discipline: at every sentence,
know what is currently in the reader's head, and make sure the next sentence is
addable to that state without exceeding what it can hold or leaving a gap it can't
fill on its own. Reference and explanation are different tools for building that
state at different reader postures; abstractions must be given a place before they
are given relationships; density is good exactly up to the point that matches
working memory and bad immediately past it; links, repetition, and detail are all
governed by the same test — does the current sentence stand on its own, and if not,
is what it's missing actually available where it's needed. None of this is about
writing less, or writing more simply in the sense of dumbing content down. It is
about sequencing and structuring genuinely difficult, complete, precise content so
that a reader's model of the system grows correctly, one stable step at a time,
instead of being handed all at once and left to assemble.


## 21. Preserve meaning separately from improving readability

A rewrite must preserve more than the nouns. Compare the original contract and the
new prose for actor, scope, obligation strength, conditions, exceptions, timing,
evidence, and deliberately open choices. Check both directions: no original rule
has disappeared, and no added explanation creates an unsupported rule.

Watch particularly for qualifier loss. "No Kernel lifecycle" does not mean "no
native lifecycle". "An optional Runtime facility" does not mean "no required
boundary obligations". "A package may be imported" does not mean "every package
comes from outside the deployment". These are semantic changes even when introduced
only to make an explanatory paragraph flow.

Keep three kinds of review separate:

| Review | Question |
|---|---|
| Contract preservation | Does the rewrite retain every relevant obligation and avoid unsupported claims? |
| Reader comprehension | Can the intended reader explain the distinction or apply it to a new example? |
| Reference retrieval | Can someone find the exact definition, condition, or limit and its owner? |

For a substantial rewrite, a fresh reader can expose assumptions the author no
longer notices. Supply the declared prerequisites and ask realistic questions.
Check answers against authoritative sources; a reader can understand an incorrect
document perfectly. Self-review is useful, but should not be reported as an
independent audit or owner approval.

Keep concept pages explanatory when that is their purpose. Improve retrieval with
stable headings, visible definitions, and links before adding a second reference
copy. If an explanation reveals a real gap in the contract, report the gap and use
the architecture decision process instead of silently resolving it through wording.

---

# Writing Doctrine

A compact reminder of this study, not a substitute for source contracts. The
[documentation skill](../.agents/skills/technical-documentation/SKILL.md) owns the
reusable editing workflow.

1. **Write for a reader's question.** Purpose and assumed knowledge determine what
   needs explanation; document length does not determine its type.
2. **Preserve the contract.** Keep ownership, conditions, obligation strength,
   exceptions, and open choices intact. Review new explanatory claims too.
3. **Distinguish definition, invariant, and explanation.** Make exact meanings easy
   to find while developing the relationships readers need to understand them.
4. **Sequence unfamiliar concepts.** Introduce or gloss prerequisites where useful;
   declared background knowledge need not be taught again.
5. **Explain supported reasons.** Separate documented rationale from hypothetical
   consequences. Leave unknown history unknown.
6. **Choose examples for a specific question.** State their assumptions and avoid
   turning one scenario into a universal property.
7. **Use contrast where it resolves a likely confusion.** Establish positive meaning
   and avoid making every term a catalog of things it is not.
8. **Organize for both reading and lookup.** Keep related ideas together; use tables,
   algorithms, and stable headings where they help. No sentence or paragraph quotas.
9. **Make responsibility clear.** Name an actor when the sources establish one;
   active voice is a preference, not permission to invent ownership.
10. **Link deliberately.** Distinguish optional depth, required prerequisites, and
    normative dependencies. Summaries should point to one maintained rule owner.
11. **Retain necessary detail.** Move premature detail to where it answers a real
    question; do not delete conditions merely to shorten a passage.
12. **Check truth and usefulness separately.** Verify semantic preservation, then
    comprehension or retrieval appropriate to the document. Report remaining gaps.
