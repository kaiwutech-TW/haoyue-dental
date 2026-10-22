# Judge readiness and pilot preparation

Scope: finish the existing dental administration demo before evaluating LINE or other industries. No real patient data, clinic bookings, automatic outreach, new GPU or increased spending allowance.

## Acceptance checklist

- [x] P0: independent demo workspaces, persistent receipts, confirmation before writes, replay/stale/conflict protections.
- [x] P0: explicit connection failures, slow-request feedback and recovery by reading stored state.
- [x] P0: deployed bilingual core flow and two-browser isolation verified with actual model evidence.
- [x] P0: operational check reports database/inference/fallback readiness without spending or falsifying balance verification.
- [x] P1: reproducible comparison of rules, base and fine-tuned decisions on the same fixed synthetic test.
- [x] P1: failure-case evidence and limitations linked from the product.
- [x] P1: first-use task, clear outcome and before/after booking visible before technical details.
- [x] P1: clinic and unfamiliar-user test kits ready; actual participant results remain pending until collected.
- [x] P1: revised submission narrative and demo instructions prepared; original submitted association retained.
- [x] P2: responsive layout, keyboard/focus, contrast and reduced-motion checks.
- [x] Release: tests, typecheck, build, local browser/API verification, deployed checks and public source sync.

Human research is complete only after real participants perform the tasks. See `docs/pilot/README.md` for collection and decision gates. Automated checks are engineering evidence, not customer validation.

## Current verification

35 unit tests pass; typecheck and production build pass. A one-request NVIDIA 30B test returned a valid decision and 422 tokens after real billing verification; US$0.02 was reserved, actual invoice charge is unknown. The production-build local browser run passes, including seven WCAG A/AA-scanned desktop/mobile states and three explicitly injected failure cases. Production deployment and deployed browser verification also pass; see `reports/readiness-deployed.json`.

Actual 4B MLX English browser and Mandarin API integration pass against an isolated local store with paid fallback capped at zero; see `reports/readiness-mlx.json`. Deployed acceptance passes on the patched Next.js 16.3.8 / NanoID 5.1.16 release: two independent browser visitors, actual NVIDIA adapter evidence, confirmation/replay/reload, five desktop/mobile accessibility states with zero automated WCAG A/AA findings, and Mandarin integration including staff reply. The release source uses an explicit, secret-scanned whitelist snapshot with exact file hashes in its generated `source-manifest.json`. Actual participant results remain pending. Dependency findings and their scope are recorded in `reports/dependency-review.md`.
