# 好約 HAOYUE — A patient dental concierge

Understand the correction. Protect the appointment.

[English interactive demo](https://haoyue-dental.vercel.app/en) · [繁體中文互動示範](https://haoyue-dental.vercel.app/) · [Model card](docs/MODEL_CARD.md) · [Training tutorial](training/README.md)

“Not cancel—please change the time.” HAOYUE turns everyday messages into confirmed dental administration actions. A simulated LINE phone sits beside a panel of actual model and transaction events. Free text and buttons share the same backend. The fictional patients never create real clinic bookings.

## What works

- Book, reschedule, cancel, look up appointments, approved administrative FAQs and human handoff.
- Real fine-tuned **NVIDIA-Nemotron-3-Nano-4B-BF16** LoRA, eight intent choices in one forward pass, served with MLX on a Mac.
- Low-score / unavailable inference routes to **NVIDIA Nano 30B on Nebius Token Factory**, subject to shared financial limits. Failure asks for clarification or hands off; it never silently pretends a rule was model inference.
- Patient confirmation, ownership/version checks, atomic Supabase transactions, replay protection and persistent readback.
- English and Traditional Chinese demo copy and fixtures. Patient guidance for explicit worry/confusion; repeated messages do not trigger another model call. These style cues are rules, not a trained emotion classifier.
- **Tavily** staff research creates drafts; an administrator must review before knowledge is used. No automatic web search on patient messages.

## Run locally

Node 24+. Copy `.env.example` to root `.env`; keep it ignored. Start with `DECISION_MODE=rule` for deterministic offline verification.

```sh
cd app
npm ci
npm run dev
```

Set `DECISION_MODE=hybrid` only with the authenticated inference endpoint and Nebius configuration. `DECISION_MODE=nebius` uses the sponsor API directly. The private `/desk` requires your `DEMO_ADMIN_TOKEN`.

## Verify

```sh
cd app
npm test
npm run typecheck
npm run build
cd ..
TEST_URL=http://localhost:3000 node --env-file=.env scripts/integration.mjs
```

Integration changes synthetic appointments and creates a handoff case. For production evidence, add `EXPECTED_REGION=hnd1 EXPECT_CHOICE=1` and the public demo URL. UI language does not change canonical internal doctor IDs.

## Measured, with limits

| Experiment | Result | Evidence |
|---|---|---|
| Fixed v2 synthetic test | Base 52/64; fine-tuned 58/64 | `reports/nvidia4b-choice-v2.json` |
| High-score accepted subset | 54 accepted, **1 wrong** at 0.85 | Same report |
| Mac/CUDA parity | Same intent on 64/64; probabilities differ slightly | `reports/mlx-choice-v2.json` |
| Mac local inference | Median 53.34 ms; excludes network | Same report |
| v2 L4 train/evaluation | 127.13 s, 397,312 LoRA parameters | Training report |
| Colab accounting | Approx. 1.61 CU observed total decrease; includes setup/idle | `reports/colab-costs.json` |

The first calibration experiment was overconfident; its failures are retained. Data is author-written synthetic Mandarin, not independent clinical validation. English demo smoke is separately recorded in `reports/english-demo-smoke.json`; equivalent bilingual performance is not established. Kev/Jev inspired the specialized decision direction, but this is **not Kev's masked multi-query architecture**. See [model card](docs/MODEL_CARD.md) and [customer-service design](docs/customer-service-design.md).

## Architecture and operating limits

Next.js → safety / guidance → NVIDIA 4B choice → budgeted Nebius fallback if needed → deterministic validation → confirmation → Supabase atomic commit → readback. The model has no direct database access. Vercel and Supabase run in Tokyo; authenticated Cloudflare Tunnel connects the Mac. [Deployment and recovery](docs/DEPLOYMENT.md) explains the local supervisor and its limitations.

Shared budgets preserve at least US$5 of the verified Nebius balance and cap this app at US$1 total / US$0.40 daily for paid fallback. Source, session and request limits also cover local inference. Expired balance snapshots disable paid fallback. Generic eve agent endpoints are blocked to prevent bypassing these controls.

The two fictional patients are shared across demo visitors. This is not real patient authentication or a production clinic system. No private customer-service spreadsheets, patient records or clinic price lists are in the public training corpus. Base weights remain subject to NVIDIA's license; project code licensing is separate.
