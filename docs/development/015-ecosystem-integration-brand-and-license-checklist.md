# Ecosystem Integration — License, Branding, and Partnership Checklist

> **Status: engineering/product release checklist. Not legal advice and not canonical architecture.**
>
> This document exists because an Arrokoth integration can be technically correct while its code
> distribution, hosted-service use, naming, logo use, or marketing claims still have separate legal
> requirements. Check the current upstream license and terms again at release time; third-party terms
> can change.

---

## 1. Keep four questions separate

For every third-party integration, answer these independently:

```text
1. Technical compatibility
   Can Arrokoth invoke, import, adapt, or interoperate with the product correctly?

2. Code/content rights
   May Arrokoth copy, modify, link, bundle, redistribute, or host the relevant upstream code/assets?

3. Trademark/branding rights
   May Arrokoth use the upstream project/company name, logo, screenshots, or marks in product UI and
   marketing, and under what attribution/nominative-use conditions?

4. Partnership status
   Is there an actual contract/certification/co-marketing relationship, or is this simply an
   independently implemented compatible integration?
```

A permissive software license does not automatically grant trademark rights or partnership status.
A public API does not automatically grant permission to redistribute the service's proprietary code.

---

## 2. Default public wording

When technically true and tested, prefer factual interoperability language such as:

```text
Compatible with X
Adapter for X
Import from X
Connect to X
Invoke X Agents
Supports X protocol/API
```

Avoid implying affiliation:

```text
Official X integration
X-certified
X partner
Endorsed by X
Built with X in cooperation with ...
```

unless written authorization actually exists.

Where useful, add a short independence notice such as:

```text
X is a trademark of its respective owner. ArrokothI is not affiliated with or endorsed by X.
```

The exact notice should be reviewed against the current trademark policy and jurisdiction.

---

## 3. Before adding an adapter

Record:

```text
upstream project/product
upstream repository/service URL
integration mode: external / wrapped / adapted / imported / native protocol
upstream software license and version/date checked
SDK/library licenses
API/service terms checked
trademark/brand-guideline URL checked
copied code/assets, if any
runtime dependencies
redistributed files/notices required
whether the integration will be offered as a hosted multi-tenant service
whether upstream credentials/secrets are involved
```

Prefer clean boundary adapters over copying upstream implementation code when a stable API/protocol is
available.

---

## 4. License checks

For software included in an Arrokoth repository/package/image:

- identify the exact license of every copied or bundled component;
- preserve copyright/license notices required by that license;
- verify whether modification/redistribution/source disclosure requirements apply;
- check whether the license has field-of-use, hosting, multi-tenant, branding, or commercial-service
  restrictions beyond a standard OSI license;
- inspect transitive dependencies of any vendor SDK used by an adapter;
- keep third-party notices reproducible from the dependency graph.

Do not infer that a project is permissively licensed from the word "open source" alone.

---

## 5. Hosted-service checks

A license that permits local use may impose different conditions when the upstream implementation is
used to provide a hosted or multi-tenant service.

Before Arrokoth Cloud ships an integration that embeds or operates substantial third-party runtime
code, ask:

```text
Are we merely calling the customer's/external upstream service?
Are we distributing an adapter SDK only?
Are we hosting an upstream runtime on the customer's behalf?
Are we offering the upstream product itself as a multi-tenant service?
```

The last two deserve explicit license/terms review and may require a commercial agreement even when a
simple API adapter does not.

---

## 6. Trademark and UI checks

Before showing an upstream name/logo in Studio, docs, website, marketplace, or launch material:

- verify the current trademark/brand policy;
- prefer plain-text nominative references when logo permission is unclear;
- do not modify or combine logos without permission;
- do not name an Arrokoth product/package in a way that suggests it is the upstream's official
  distribution;
- make ownership/independence clear where confusion is plausible;
- use screenshots only when the relevant terms permit it.

Package naming should generally favor an Arrokoth namespace, for example conceptually:

```text
@arrokoth/integration-hermes
@arrokoth/integration-openclaw
@arrokoth/integration-dify
```

rather than names that appear to be published by the upstream vendor.

Actual package scope/naming remains a product decision.

---

## 7. When no bilateral contract is normally needed

Subject to the current upstream license/terms, a formal partnership is often unnecessary when
Arrokoth independently implements ordinary interoperability using:

```text
public documented APIs
open protocols such as HTTP/MCP/A2A
permissively licensed SDKs/code under their license conditions
customer-provided endpoints and credentials
nominative factual compatibility references
```

The integration should still be tested and the release checklist completed.

---

## 8. When a formal agreement may be valuable or necessary

Escalate for partnership/commercial/legal review when the product wants any of the following:

```text
co-marketing or partner-directory placement
certified/official integration status
use of partner logos beyond ordinary nominative reference
private/partner APIs
bundled commercial licenses
reselling upstream service/model usage
hosting an upstream product where its license restricts that service model
joint enterprise support/SLA
shared customer data beyond ordinary customer-configured API use
joint security/compliance commitments
preinstalled credentials/accounts
commercial marketplace revenue share
```

A partnership can improve distribution and support even when it is not technically required.

---

## 9. Integration-specific notes as of 2026-09-01

These are snapshots for planning only. Re-check upstream terms immediately before release.

### Hermes Agent

Current public repository materials indicate an MIT-licensed project. That is generally permissive for
use, modification, and redistribution subject to preserving the license/copyright notice. Treat
Hermes/Nous names and logos separately from the software license, and do not imply official
partnership without authorization.

A clean AgentExecutor adapter implemented against public Hermes interfaces is preferable to forking or
redistributing unnecessary Hermes implementation code.

### OpenClaw

Current public repository materials indicate an MIT-licensed project. The same separation applies:
software license rights do not automatically create trademark, logo, certification, or endorsement
rights.

Prefer public Gateway/API/protocol integration or a clean adapter boundary. If Arrokoth ever embeds a
large portion of the OpenClaw runtime, re-evaluate notices, dependencies, security responsibility,
and product-brand presentation.

### Dify

Dify requires extra attention because its current repository uses the **Dify Open Source License**,
which incorporates Apache 2.0 terms with additional conditions/restrictions. Current upstream
materials specifically distinguish ordinary use from certain multi-tenant/service scenarios and
provide commercial licensing paths.

Therefore:

```text
calling a customer's Dify App API
    !=
shipping an Arrokoth-owned Dify runtime
    !=
offering Dify itself as part of a multi-tenant Arrokoth Cloud service
```

Do not assume all three are allowed on identical terms. An API/DSL interoperability adapter can be a
much cleaner legal/product boundary than embedding Dify's platform implementation.

---

## 10. Secrets and customer authorization

Compatibility with another Agent platform does not authorize Arrokoth to copy its stored credentials.

Importers should default to:

```text
read non-secret portable configuration where permitted
        ↓
identify required external resources/operations
        ↓
ask the user/admin to bind credentials in Arrokoth or the external service
```

Do not silently migrate API keys, OAuth refresh tokens, session cookies, private auth stores, or other
credentials from an external Agent workspace unless the user explicitly authorizes a supported secure
migration path and the upstream terms permit it.

---

## 11. Release checklist

Before announcing an integration as supported:

```text
[ ] Technical compatibility tests pass.
[ ] Integration assurance level is documented accurately.
[ ] Current upstream software license was reviewed.
[ ] Current API/service terms were reviewed where applicable.
[ ] Required third-party notices are included.
[ ] Hosted/multi-tenant implications were reviewed.
[ ] Current trademark/brand guidelines were reviewed.
[ ] Product wording does not imply an untrue partnership/certification.
[ ] Logo/name usage is permitted or replaced with safe factual text.
[ ] Secrets/credentials are not copied implicitly.
[ ] Security responsibility between Arrokoth and external runtime is documented.
[ ] Unsupported semantic differences are surfaced rather than hidden.
[ ] A named owner/date exists for the review so stale assumptions can be revisited.
```

For a significant commercial launch, have qualified counsel review integrations whose licenses,
service terms, trademark policies, or hosting models are non-standard or materially ambiguous.
