# A Study of Technical Writing Craft, for Rewriting Difficult Architecture Documentation

This is a working theory of how to write technical documentation that describes a
hard, unfamiliar system — the kind where correctness of individual sentences is not
the hard part, and legibility is. It synthesizes two sources: the Diátaxis
framework's treatment of reference documentation (and, by necessary contrast, its
treatment of tutorials, how-to guides, and explanation), and Google's technical
writing course material on sentence and paragraph craft, terminology, audience, and
document organization. Neither source is quoted at length below; both are digested
into a single set of working principles, illustrated with invented examples from a
generic system (a small distributed job scheduler, with concepts like *Job*,
*Worker*, *Ledger*, *Reconciler*, *Watchdog*) chosen only to be concrete without
borrowing anyone's real prose.

The premise throughout: a document can be factually correct and still fail, because
writing is not just the transcription of true facts — it is the construction of a
sequence of mental states in a reader's head, each one building on the last. Bad
architecture documentation is usually not *wrong*. It is unsequenced, uncompressed
correctly, or silent about relationships the reader is left to infer. This document
is about the discipline of managing what the reader knows at every point in the text.

## 1. The four kinds of documentation, and why reference is the hardest to write well

Diátaxis's core observation is that documentation serves four distinct reader needs,
and that conflating them is the single largest source of bad documentation. The four
needs sort along two questions: is the reader acting or cognizing (doing something
with their hands, or forming understanding in their head), and are they acquiring a
new capability or applying one they already have?

- **Tutorial**: the reader is acting, and acquiring. They are a learner, following a
  guided, reliable, hand-held path toward a first success, so that they leave with a
  capability they didn't have when they started. A tutorial's job is not to be
  efficient or complete — it's to make the first success *certain*. It should
  actively resist explaining "why," because a learner mid-task has no place to put a
  why yet; it hasn't earned meaning.
- **How-to guide**: the reader is acting, and applying a capability they already
  have, toward a specific goal of their own choosing. A how-to guide is written from
  the perspective of the goal, not the machinery — "if you want X, do Y" — and it
  assumes competence. It contains action and only action: no teaching, no full
  enumeration of options, no history.
- **Reference**: the reader is cognizing, but applying — they already know roughly
  what they're doing and need a fact to keep doing it correctly. Reference is
  consulted, not read start to finish, the way a dictionary or a map is consulted.
  Its obligation is to be *complete and neutral about the thing itself*: what exists,
  what its behavior and limits are, what is required and forbidden. It must resist
  becoming instructional ("first configure, then run") and resist becoming
  argumentative ("this design is better because"). Both are contamination from a
  different documentation type.
- **Explanation**: the reader is cognizing, and acquiring — they want to understand,
  independent of any task in front of them right now. Explanation is the only mode
  that is allowed, and expected, to discuss alternatives, history, trade-offs, and
  opinions. It has the widest lens of the four: not "how do I use this," but "what
  is this, in the context of everything around it, and why does it look the way it
  does."

The reason this taxonomy matters for architecture documentation specifically is that
architecture documentation is almost always attempting to be reference and
explanation *at once*, in the same paragraphs, without acknowledging the switch. A
paragraph that states a Kernel's authority rule, then immediately argues for why that
rule is correct, then gives a historical aside about a design that was rejected, is
doing three jobs with three different reader postures, and the reader has to
constantly re-orient to figure out which sentence is a fact they must remember and
which is color they may skip. Good architecture documentation keeps these modes
typographically and structurally distinguishable — a reference statement, then an
explicitly separated "why" — even when they live in the same document, because
that lets a reader choose, sentence by sentence, whether they are here to look
something up or to understand something.

### How explanation supports reference, instead of contaminating it

Reference is supposed to be austere: state facts, list rules, avoid narrative and
argument. Taken naively, this sounds like it produces documentation that is correct
but unmotivated — a wall of "you must" and "you must not" that a reader can look up
but never really absorb, because nothing connects the rules to each other.

The resolution is that reference should be austere *locally* while remaining richly
connected *structurally*, and the thing that supplies the connective tissue is
explanation, kept in its own clearly marked territory and linked to, not folded in.
A reference entry for a concept like a *Ledger commit* can state, with total
neutrality, what inputs it requires, what it guarantees, and what it forbids. It
does not need to argue for why those guarantees were chosen, but it is much more
usable if a reader who wants to know *why* can follow one clearly-labeled link to an
explanation of the trade-off (say, why the Ledger chose linearizable commits over a
faster eventually-consistent alternative, and what broke under the old design). The
reference stays a trustworthy map; the explanation is available for the reader who
wants the territory's geology. What breaks documentation is not the presence of both
kinds of content, but their being interleaved without a signal, so a reader can never
tell, mid-paragraph, whether the next sentence is a fact to memorize or an argument
they're free to skim.

A second way explanation supports reference: reference documents presuppose a
vocabulary. A concept like "Activation" or "authority" can be *used* correctly in
reference prose only after the reader has a mental model of what that word points
to — and building that first mental model is explanation's job, not reference's.
Reference should be written for a reader who has already read (or can look up) the
explanation that introduced the term; it should not try to re-teach the concept
every time it uses the word, but it also cannot assume the reader arrived with the
vocabulary already installed. The practical resolution, covered in more depth in
§9 and §15, is a short in-place gloss plus a link to the fuller explanation, so
reference stays terse without stranding a reader who skipped ahead.

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

A concrete rule follows directly from §2: never use a term as a grammatical subject
or object before the reader has been told, in some form, what category of thing it
is and roughly what it's for. This does not require a full definition before every
use — full definitions are expensive and belong in one canonical place — but it does
require at least a one-clause anchor at first mention: a name, a category, and a
reason to care, in that order.

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

## 4. Definition versus explanation

These are different acts, and conflating them is one of the most common failures in
architecture documentation. A **definition** bounds a term: it tells the reader how
to recognize the thing and distinguish it from neighbors, in the fewest words that
do so reliably. An **explanation** motivates the term: it tells the reader why the
thing exists, what problem it resolves, what alternative was rejected and why, and
how it connects to the rest of the system.

> Definition: "A Job has exactly one owning Worker at any moment."

This is complete as a definition — a reader now knows a fact they can check against
any implementation. But it does not tell them why single ownership matters, so they
cannot reason about what happens in the cases the sentence doesn't cover: what if two
Workers each believe they own the same Job? Is that scenario impossible, or merely
undocumented?

> Explanation (kept separate, and clearly a different kind of sentence): "Single
> ownership exists because two Workers acting on the same Job concurrently produced
> silently duplicated side effects in an earlier design; ownership is the mechanism
> that makes 'exactly one Worker acts' checkable, not just intended."

The definition alone is technically complete and reads as a "one-line definition
used as if it were an explanation" — the most common way architecture docs feel
authoritative but leave the reader unable to extend the rule to new situations. The
failure is not that the definition is wrong; it's that a concept load-bearing enough
to structure the whole system was given only a definition, when it needed both. A
useful working test: if removing a sentence would leave the reader able to state the
rule but not able to predict what happens in a case the document didn't explicitly
cover, that sentence was a definition standing in for an explanation the reader
still needs.

The corollary is that not everything needs explanation. A term that is genuinely
just a label for something the reader will never need to reason about beyond
recognition — a field name, a status code — needs only a definition, and giving it
an explanation anyway is where documentation starts to feel padded rather than deep.

## 5. When to explain why a concept exists

Explain the "why" for a concept when either of two conditions holds: the reader
could not have predicted the concept's existence from the problem statement alone,
or the concept is the resolved form of a real tension between two things the system
wants and can't fully have at once (a trade-off). Both conditions point at the same
underlying test: *is this a design decision, or a consequence?*

A queue existing because work arrives faster than it can be processed is a
consequence, not a decision — no reader needs that justified, and doing so anyway
wastes their attention and, worse, trains them to skim every "why" paragraph because
some fraction of them turn out to be unnecessary. But a queue that drops the oldest
item instead of the newest when full is a decision — one a reader could not derive
from the mere existence of a queue — and it deserves exactly one sentence naming the
alternative (drop newest) and the concrete failure it would have caused (a client
retry storm feeding all its retries to the front of the queue, starving the older,
already-waiting work). Naming the rejected alternative and its specific failure is
what makes a design feel motivated instead of arbitrary; a "why" paragraph that
states only the chosen behavior, dressed in explanatory language, teaches nothing a
plain definition didn't already say.

Applying this test also prevents the opposite failure — omitted "why" for a genuinely
surprising decision, which is what makes a reader feel the architecture is arbitrary
or, worse, that they're missing something everyone else already knows (the reader's
version of the curse of knowledge described in §14).

## 6. When examples help, and how they should be chosen

An example's job is to convert a proposition the reader can recite into an instance
they can recognize. This is most valuable at exactly two moments: the first time an
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
valid call, a single valid record), not a sequence of steps toward a goal. The
moment an example in a reference entry starts to read "first do this, then do that,"
it has quietly become a how-to guide embedded in the wrong document (see §19).

## 7. Contrast and counterexamples; explaining what something is not

Concepts are bounded by their edges as much as by their centers, and for
architecture terms that resemble something the reader already knows from elsewhere —
a "session," an "event," an "activation" — the fastest way to install the correct
boundary is often a direct negative statement, not more positive description.

> "An Activation is not a request-response call the caller blocks on; it is a
> message the Kernel hands to a Runtime and then stops waiting on. If you are
> picturing a synchronous function call, replace that picture — nothing here
> blocks the caller."

This kind of sentence does more corrective work in one line than several paragraphs
of purely positive description, because the reader likely already has a wrong (or
half-right) model borrowed from somewhere else, and positive description alone
doesn't tell them *that* model is wrong, only adds detail on top of it.

Counterexamples are particularly powerful for any concept that exists specifically
because an earlier design failed. Naming the earlier design and the concrete way it
failed does two things at once: it answers "why does this exist" (§5) and it draws
the boundary of the new concept precisely, because the boundary usually *is* the
place the old design broke. "Unlike the previous design, where any Worker could
resume any Job's native session, an Activation is scoped so a stale Worker can never
resume one — that specific hazard is what the earlier scheme allowed" teaches the
concept, its motivation, and its boundary in a single move.

## 8. Prerequisite ordering

A document, or a set of documents, has an implicit dependency graph over its
concepts: term B's full meaning depends on term A having already been established.
Good architecture writing makes that graph explicit to itself before writing a word,
and then honors it — which is a stronger requirement than merely defining every term
*somewhere*.

Concretely: for every technical term used in a section, ask whether its meaning here
depends on something introduced later. If it does, there are exactly three legitimate
resolutions — move the dependency earlier; forward-reference explicitly with a
pointer and a one-line gloss ("a Runtime — the component that actually performs the
work; covered fully in §4 — reports back with an Outcome"); or restructure the
document so the dependency isn't needed yet. The illegitimate resolution, which is
extremely common, is to use the term and hope the reader either already knows it or
will patch their understanding in later — silent prerequisite inversion is one of
the single largest sources of "the reader has to reconstruct relationships
themselves."

The one-line gloss deserves emphasis as a technique: it is not a second, weaker
definition competing with a canonical one elsewhere — it is a cheap, disposable
placeholder that lets the current sentence be understood *now*, with the full
treatment linked for whenever the reader wants it. This costs five to ten words and
saves the reader from either stopping to go look something up mid-thought or reading
on with an unresolved gap.

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

Density should be measured as new-concept-load per sentence, not word count. A
sentence that introduces exactly one new fact or one new relationship, using
precise, technical language, is appropriately dense — that is in fact the target,
not a compromise. A sentence becomes exhausting, not merely dense, when it
introduces more than one new relationship among more than two or three named
entities at once, especially if it also embeds an implicit causal or conditional
claim ("because," "unless," "which then") on top of that.

A rough, usable diagnostic: count the technical proper nouns in a sentence that are
being related to each other for the first time. Two is normal. Three is a sentence
worth checking. Four or more, especially combined with a causal connective, is
almost always a sentence that should become two or three sentences, or a short list.
This is not a stylistic preference for short sentences for their own sake — see §12
— it is a direct application of the working-memory limit from §2: density that
exceeds it doesn't read as rich, it reads as a wall the reader has to climb the same
part of twice.

## 11. Paragraph structure

A paragraph should make and support exactly one claim. The opening sentence should
state that claim in a form the reader can act on even if they read no further —
which matters because readers of technical documentation routinely skim first
sentences to decide whether to read the rest. Every subsequent sentence in the
paragraph should be doing one of three jobs relative to that opening claim:
narrowing it, supporting it with a reason or mechanism, or qualifying it with a
limit. A sentence that does none of these — that introduces a second, independent
claim — belongs in its own paragraph, even if it's short and feels like it "goes
together" with the first.

A frequent architecture-writing failure is the paragraph that does three jobs at
once: define a concept, argue for its motivation, and illustrate it with an example,
all in four or five run-on sentences. Splitting this into a definition sentence, a
motivation sentence or two, and an example — even without adding a single new fact —
usually makes the same content noticeably easier to hold, because each unit now has
one job and the reader always knows which job they're currently reading.

On length: a paragraph of three to five sentences is a reasonable target; much
beyond seven, a paragraph is very likely carrying more than one claim and should be
split along the seam described above. A run of many single-sentence paragraphs in a
row is the opposite failure — usually a sign that closely related claims were
artificially separated and should be regrouped, or that the writer is listing
without yet noticing they're listing (see §12 on converting embedded enumeration
into an actual list).

## 12. Sentence structure

Three concrete habits do most of the work.

**Prefer active voice with a named actor.** In architecture prose specifically,
passive voice is not just a style question — it is very often the mechanism by
which a sentence avoids saying who is responsible for something, which is exactly
the ambiguity that causes the largest arguments about a system later ("who handles
this?").

> Bad: "Retries are throttled after three consecutive failures."
> Better: "The Watchdog throttles retries after three consecutive failures."

The second version is not just more direct; it is more *true* in the sense that
matters for an architecture document — it names the component with authority over
the behavior, which is precisely the information a reader needs and the first
version conceals.

**Use strong, specific verbs instead of generic ones.** Verbs like "is," "occurs,"
"happens," and "involves" push all the actual meaning of a sentence into its nouns
and prepositional phrases, which is harder to parse and easier to skim past without
noticing.

> Bad: "Failure detection is performed by the Watchdog through periodic heartbeat
> checks."
> Better: "The Watchdog detects failure by checking heartbeats periodically."

**Keep one idea per sentence, and convert embedded enumeration into real lists.**
A sentence joined by "and," a relative clause introduced by "which," or a semicolon
holding two independent technical claims is a strong signal to split — or, if the
items are genuinely parallel, to lift them into an actual bulleted or numbered list
rather than leaving them buried in prose:

> Bad: "A Job may fail because its Worker crashed, because its input was malformed,
> or because it exceeded its deadline, and in each case the Reconciler takes a
> different action."
> Better: "A Job can fail for three reasons, and the Reconciler responds
> differently to each:
> - the Worker crashed — the Job is reassigned to a new Worker;
> - the input was malformed — the Job is marked permanently failed;
> - the Job exceeded its deadline — the Job is retried once, then marked failed."

Finally, resolve pronouns aggressively. In prose already carrying two or three
technical nouns, a bare "it" a few clauses later is a common, avoidable source of
the reader having to stop and figure out which noun it refers to — repeat the noun
instead, even at the cost of a little variety, because variety is not a value in
reference prose the way precision is.

## 13. Terminology

The single most damaging habit in architecture documentation is introducing a
synonym for stylistic variety — calling the same concept a "Job" in one paragraph
and a "task" or "unit of work" in the next, meaning no difference at all. A reader
encountering a new word has no way to know, on first read, whether it names a new
concept or is just a different word for one they already have; every synonym is
therefore a small tax the reader pays to find out, by re-reading, that nothing new
was actually said. The rule is one name per concept, used identically everywhere,
even where it feels repetitive to the writer — repetitiveness is a cost the writer
feels and the reader does not; ambiguity is a cost the reader feels far more than
the writer, who already knows the words are synonyms.

Terms should be defined once, prominently, at or very near first use, and that
definition should be easy to find again later (a glossary, or a canonical reference
entry linked consistently) rather than requiring the reader to recall which of
several earlier paragraphs first mentioned it. When a term is reintroduced after a
long gap in the document, a short parenthetical reminder of its meaning costs little
and prevents the reader from having to search backward.

Borrowing a term from a similar technology elsewhere is risky specifically because
it imports the reader's existing associations along with the word — if those
associations don't map precisely onto the new usage, the borrowed term actively
misleads rather than merely under-informing. It is often better to coin a
deliberately distinct term for a concept that resembles, but is not identical to, a
well-known one elsewhere, precisely so the reader doesn't carry over assumptions
that don't hold. When a borrowed term is used anyway because it's genuinely the
right fit, the document should say explicitly which of the familiar term's usual
properties do and don't carry over — the contrast technique from §7 applied to
terminology specifically.

## 14. Cross-document links

A link is legitimate when the sentence containing it is already complete and
correct without the reader following it — the link offers a genuine, deferrable
tangent (more depth, a related but separate concern, the full formal treatment).
A link is illegitimate when the sentence doesn't actually make sense unless the
reader follows it, because that is the document silently outsourcing an explanation
it owes the reader right now.

> Illegitimate: "The Reconciler resolves conflicting updates using standard
> conflict-free merge semantics (see link)."

If the reader doesn't already know what that phrase implies for *this* system,
they cannot evaluate anything that follows without leaving the page — the current
document has not actually said anything self-contained.

> Legitimate: "The Reconciler resolves conflicting updates by always keeping the
> update with the later timestamp; ties are broken by Worker ID. (For the general
> theory behind this kind of merge rule, see [link].)"

Here the local sentence is complete on its own — a reader who never clicks the link
still has a correct, if less theoretically grounded, understanding of what happens.
The link adds depth for a reader who wants it, rather than substituting for the
explanation the current document is responsible for.

A useful test for an entire document: could a reader who followed none of its links
still end up with a correct mental model of everything the document claims, even if
a less complete one? If the answer is no, the document has links standing in for
content it hasn't actually written yet, not a well-organized set of cross-references.

Link anchor text should also tell the reader *why* they might want to follow it now
versus later ("for the failure history behind this decision, see...") rather than a
bare "see also" or "more here," which forces the reader to click just to find out
whether clicking was worth it.

## 15. Repetition versus necessary local explanation

Not all repetition is waste. There is a sharp difference between **lazy
repetition** — copy-pasting the same paragraph of explanation into multiple
documents, which then silently diverges the first time one copy is updated and the
other isn't — and **anchoring repetition** — a short, deliberate, five-to-ten-word
reminder of a prerequisite concept, placed exactly where it's used again after a
gap, that costs almost nothing and saves the reader a trip elsewhere.

The failure mode of forcing a reader to hold several other documents in mind
simultaneously just to parse the current sentence is not solved by writing longer,
self-contained documents that duplicate everything — that just relocates the
maintenance cost onto keeping duplicates in sync, which reliably fails over time.
It's solved by using the one-line gloss technique from §8 consistently: repeat the
*minimum* restatement that makes the current sentence self-sufficient, and link to
the canonical, single source of the full treatment for anyone who needs more. The
canonical source itself should never be duplicated; the gloss pointing at it can be,
freely.

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

## 18. Making a reference document deep and useful without turning it into a tutorial

Depth in reference documentation means completeness and precision about the thing
itself — every state it can be in, every transition, every invariant, every limit,
every error condition, every caller obligation — not narrative depth, and not
motivational depth (that belongs to explanation, linked out per §1 and §14).

A reliable tell that reference prose has drifted into how-to territory is the
appearance of sequencing language — "first," "then," "next," "now" — inside a
reference entry. Reference is allowed to state an *invariant about* order ("open()
must precede configure()") without narrating a walkthrough of performing that order:

> Reference-appropriate: "Call order: open() must be called before configure();
> configure() must be called before run(). Calling run() before configure() returns
> an InvalidState error."
> How-to-appropriate (belongs in a different document): "First, call open() to
> acquire the handle. Then, call configure() with your desired options. Finally,
> call run() to start processing."

Both are true. Only the first is reference; the second is a walkthrough for a
reader who is actively doing the task right now, which is a different reader
posture (§1) and belongs in its own document, linked from the reference entry rather
than folded into it.

The other lever for reference depth without narrative bloat is structural
consistency — the "mirror the structure of the thing being described" principle.
When every entity in a reference section is described using the same fixed set of
fields (definition, invariants, who may invoke it, failure behavior, limits), a
reader's eye learns the pattern after the first one or two entries and can then scan
directly to the field they need in every subsequent entry, without reading
narrative prose to locate it. This is what allows a reference document to be dense
*and* comfortable: the density is organized by a predictable shape, not scattered
through free-form paragraphs the reader has to read in full every time.

## 19. Common failure modes in architecture documentation

Gathering the diagnostics above into one checklist of symptoms to watch for while
rewriting:

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
  without following a link, rather than a self-sufficient sentence that merely
  offers a link for more depth (§14).
- **Prerequisite inversion**: a term used before it has been anchored, forcing the
  reader to carry an unresolved forward reference (§3, §8).
- **Narrative bleeding into reference**: sequencing language ("first... then...")
  inside what should be a neutral statement of invariants (§18).
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

---

# Writing Doctrine

The following is a compact, self-contained set of principles for rewriting
technical architecture documentation. It assumes no other context beyond itself.

**1. Know which of the four jobs a passage is doing, and don't mix them silently.**
Tutorial (guided first success), how-to (goal-directed action for a competent
reader), reference (neutral, complete, consultable facts about the thing itself),
explanation (motivation, trade-offs, history, alternatives, connections). A passage
may need more than one, but must signal the switch — structurally or
typographically — rather than blending them inside one paragraph.

**2. Reference stays austere; explanation stays linked, not folded in.** State facts,
invariants, limits, and required call order neutrally. Never argue for a design's
correctness inside a reference statement. Never narrate a sequence of actions
("first... then...") inside a reference entry — that content belongs in a how-to.
Link outward to explanation for "why," and make sure that linked explanation
eventually cashes out in something concrete a reader could act on, not permanently
abstract commentary.

**3. Never use a term as subject or object before it has a place.** At first mention,
give a name, its category (thing / process / guarantee / role), and a reason to
care — in that order — before using it in a relationship with anything else. Once a
term has been anchored once (in this document, or in a linked canonical definition
the reader can be assumed to reach), terse reuse is correct and desirable.

**4. Separate definition from explanation and give both to load-bearing concepts.**
A definition bounds a term (how to recognize it). An explanation motivates it (why
it exists, what alternative was rejected and why, what breaks without it). Give a
plain definition to minor terms. Give both to any concept whose behavior a reader
will need to predict in cases the document doesn't explicitly enumerate.

**5. Justify decisions, not consequences.** Explain "why" for anything the reader
could not have derived from the bare problem statement, or that resolves a genuine
trade-off — and when you do, name the rejected alternative and the specific failure
it would have caused. Do not explain why for things that are self-evidently
necessary; that wastes the reader's trust in your "why" sections generally.

**6. Choose the smallest example that actually crosses the boundary you just
described**, not the most realistic-looking one. Reuse one running example across a
document instead of inventing new casts of characters per illustration. In reference
prose, keep examples illustrative (showing shape) rather than instructional (showing
steps) — instructional walkthroughs belong in how-to documents.

**7. State what something is not when it resembles something the reader already
knows wrongly.** A direct negative sentence ("this is not X; unlike X, it..." )
repairs a borrowed, half-wrong mental model faster than any amount of additional
positive description. Counterexamples drawn from a rejected earlier design do double
duty: they motivate the concept and draw its boundary at once.

**8. Respect the dependency graph of your own concepts.** Before writing a section,
know which terms it uses depend on terms introduced later, and resolve every one of
them by moving content earlier, adding an explicit one-line forward gloss with a
link, or restructuring — never by silent forward reference that assumes the reader
already knows or will patch their understanding later.

**9. Disclose in layers, and let a reader stop after any complete layer.** Orient
(what it is and why, in about a paragraph) before operating (full reference-grade
behavior) before edging (exceptions and failure modes). A reader who stops after the
orientation layer should hold a true, if incomplete, belief — never a simplified lie
that later detail contradicts. Split documents by layer when different audiences
need to stop at different depths, even for "the same" subsystem.

**10. Measure density by new-concept-load per sentence, not word count.** One new
technical relationship per sentence is the target. More than two or three
newly-related technical proper nouns in one sentence, especially with an embedded
causal connective, means split the sentence or convert the content into a list.

**11. One claim per paragraph, stated in the opening sentence.** Every other
sentence in the paragraph must narrow, support, or qualify that opening claim; a
sentence that introduces an independent claim belongs in its own paragraph. Target
three to five sentences per paragraph; beyond seven, look for a hidden second claim
to split out; a long run of one-sentence paragraphs usually means related claims
were separated and should be regrouped.

**12. Use active voice with a named actor, strong specific verbs, and one idea per
sentence.** Avoid passive constructions that hide who is responsible for a
behavior — that ambiguity is exactly what later causes disputes about ownership.
Avoid generic verbs ("is," "occurs," "happens," "involves") that push meaning into
nouns; prefer verbs that state the actual action. Convert an "and"/"which"-joined
sentence carrying two independent technical claims into two sentences or a list.
Resolve pronouns by repeating the noun rather than risking ambiguity after two or
more technical nouns have already appeared.

**13. One name per concept, always.** Never introduce a synonym for stylistic
variety — every synonym forces the reader to verify it isn't a new concept.
Define each term once, prominently, at first use, in a place that stays easy to find
again; give a short parenthetical reminder on reuse after a long gap. Avoid
borrowing a term from a similar but non-identical technology unless you explicitly
state which of its usual properties do and do not carry over.

**14. A link must be a deferrable bonus, never a required patch.** A sentence
containing a link must be true and complete on its own; the link adds optional
depth, it does not supply meaning the sentence is missing. If a reader who follows
no links in a document would end up with an incorrect (not merely incomplete) mental
model, the document is unfinished, not well cross-referenced. Anchor text should say
what the reader gets and why they might want it now or later, not "see also."

**15. Distinguish lazy repetition from anchoring repetition.** Never duplicate a full
explanation across documents — it will silently rot as one copy is updated and
others aren't. Do use a short (five-to-ten-word) local gloss of a prerequisite
concept at its point of reuse, linked to the single canonical full treatment, so the
current sentence is self-sufficient without requiring a detour.

**16. Add detail only when you can name the question it answers.** Detail that
resolves a real, anticipated reader question (an edge case, a boundary, a failure
mode raised by the preceding sentence) improves comprehension. Detail inserted
parenthetically into a sentence establishing something else, answering a question
the reader hasn't yet formed, is noise — cut it, or move it to a dedicated
edge-case subsection where the question will actually arise.

**17. Separate a general rule from its exceptions structurally, never merge them
into one sentence for the sake of completeness.** State the rule as one clean
sentence. State each exception, and each exception-to-the-exception, as its own
sentence or list item. This loses no precision and removes most of the cognitive
load of technically-correct-but-exhausting prose.

**18. Keep reference deep via completeness of the thing described, not narrative
depth.** Cover every state, transition, invariant, limit, error condition, and
caller obligation neutrally. If sequencing language ("first," "then," "next")
appears inside a reference entry, that content has become a how-to and should move
to its own document, linked from the reference entry. Use a fixed, repeated set of
fields across every entry in a reference section so density becomes a scannable,
learnable pattern rather than a wall of undifferentiated prose.

**19. Before finishing any passage, run these checks:** Does every technical proper
noun have a place before it has a relationship? Does every load-bearing concept have
both a definition and a motivation? Does every sentence carry at most a small,
countable number of new technical relationships? Does every paragraph make exactly
one claim, stated first? Is every actor named, every verb specific, every pronoun
resolvable? Is every term used with exactly one name throughout? Is every link
optional rather than load-bearing? Can you name, for every parenthetical detail, the
question it answers? Is every general rule stated once, cleanly, before its
exceptions are listed separately? If a passage fails one of these checks, the fix is
almost always to resequence and restructure what is already true and known — not to
research or add new content.
