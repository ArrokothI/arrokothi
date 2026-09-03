# Ecosystem integration, brand, and license checklist

> **Status:** active engineering/product checklist for ArrokothI integrations.
> **This is not canonical architecture and not legal advice.**

Technical interoperability, software/content rights, trademark rights, and partnership status are
separate questions. Re-check current upstream licenses, service terms, and brand policies at release
time; this repository's engineering notes cannot make a legal determination.

## 1. Four independent questions

For every third-party integration, answer:

```text
1. Technical compatibility
   Can ArrokothI invoke, import, adapt, or interoperate correctly?

2. Code/content rights
   May the project copy, modify, link, bundle, redistribute, or host the code/assets involved?

3. Trademark/branding rights
   May the project use the upstream name, logo, screenshots, or marks, and under what conditions?

4. Partnership status
   Is there an actual contract/certification/co-marketing relationship, or only independent
   compatibility?
```

A permissive code license does not grant trademark rights or partnership status. A public API does
not necessarily permit redistribution or multi-tenant hosting of the upstream product.

## 2. Integration record

Before implementation or release, record:

```text
upstream product/project and authoritative URL
integration mode: external call / adapter / import / protocol / bundled runtime
software and SDK licenses, versions, and date checked
API/service terms and date checked
trademark/brand-guideline URL and date checked
copied code/assets and required notices
runtime and transitive dependencies
credential/secret flow and responsible party
local vs hosted vs multi-tenant deployment
security/containment responsibility
supported semantic subset and known mismatches
test/canary evidence and named review owner
```

Prefer a clean adapter around a stable public API/protocol over copying an upstream implementation
when that satisfies the product goal.

## 3. Public wording and names

When accurate and tested, prefer factual wording:

```text
Compatible with X
Adapter for X
Import from X
Connect to X
Supports X protocol/API
```

Do not claim `official`, `certified`, `partner`, `endorsed`, or co-developed status without the
corresponding authorization. Use a plain-text nominative reference when logo permission is unclear,
and add an independence notice when confusion is plausible.

First-party packages should use the ArrokothI namespace, for example:

```text
@arrokothi/integration-<name>
```

The package description may name the compatible product factually; its name and presentation must
not imply publication by the upstream vendor.

## 4. Software and distribution checks

- identify the exact license for every copied, bundled, linked, or generated component;
- preserve copyright/license/notices required by that license;
- check modification, redistribution, source-disclosure, field-of-use, commercial, and hosting
  conditions;
- inspect adapter SDK transitive dependencies and produce reproducible third-party notices;
- distinguish calling an external service from distributing or hosting its implementation;
- do not infer permissive terms from “open source” alone.

## 5. Hosted and multi-tenant checks

Classify the product behavior:

```text
calling the customer's/external upstream service
distributing an adapter SDK
hosting an upstream runtime for one customer
offering the upstream product as part of a multi-tenant service
```

The latter two require explicit terms/license/security review and may require a commercial
agreement even when a simple API adapter does not.

Hosted integration review must also identify data residency, subprocess/container boundaries,
network egress, secret storage, resource limits, audit retention, incident responsibility, and
whether isolation claims are actually enforced.

## 6. Trademark and UI checks

Before using an upstream name, logo, screenshot, or mark in Studio, documentation, a marketplace,
or launch material:

- verify the current brand/trademark policy;
- use only permitted assets and required clear space/attribution;
- do not modify or combine logos without permission;
- avoid product/package names that suggest an official distribution;
- make ownership and independence clear;
- confirm screenshot/content use under current terms.

## 7. Secrets and customer authorization

Compatibility with an external Agent platform does not authorize copying its credentials.

Default importer flow:

```text
read permitted non-secret portable configuration
  → identify required external resources/operations
  → ask the user/admin to bind credentials in ArrokothI or the external service
```

Do not silently migrate API keys, OAuth refresh tokens, session cookies, private auth stores, or
other credentials. Any supported migration requires explicit user authorization, a secure path, and
permission under upstream terms.

## 8. When bilateral review is likely

Escalate for commercial/legal/partnership review when the launch involves:

- co-marketing, partner-directory placement, certification, or official status;
- partner logos beyond ordinary nominative use;
- private/partner APIs or preinstalled credentials/accounts;
- bundled commercial licenses, resale, revenue share, or joint enterprise support/SLA;
- hosting an upstream product under non-standard or multi-tenant restrictions;
- shared customer data or joint security/compliance commitments.

A bilateral agreement may be valuable even when independent technical compatibility is allowed.

## 9. Release checklist

```text
[ ] Supported behavior and semantic mismatches are documented.
[ ] Compatibility/conformance tests pass; live canary evidence is current where needed.
[ ] Current upstream code/SDK licenses and transitive notices were reviewed.
[ ] Current API/service and hosted/multi-tenant terms were reviewed.
[ ] Trademark/brand guidelines and UI assets were reviewed.
[ ] Public wording does not imply an untrue affiliation/certification.
[ ] Required notices and attribution are included.
[ ] Credential ownership, binding, storage, rotation, and revocation are explicit.
[ ] Security/containment responsibility and failure behavior are documented.
[ ] Import/discovery does not grant ArrokothI authority.
[ ] Unsupported protocol states fail closed rather than being hidden.
[ ] A named owner and review date make stale assumptions discoverable.
[ ] Qualified counsel reviewed non-standard or materially ambiguous terms for commercial release.
```

Historical source and dated integration-specific snapshots:
[`legacy/015-ecosystem-integration-brand-and-license-checklist.md`](legacy/015-ecosystem-integration-brand-and-license-checklist.md).
