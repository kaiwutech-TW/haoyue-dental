## Inspiration
“Not cancel—please change the time.” A dental appointment conversation often contains corrections, hesitation and accidental clicks. A fluent answer alone does not establish that the right booking changed. HAOYUE explores a narrower goal: connect everyday language to a reviewable, confirmed administrative transaction.

The target users are patients adjusting bookings and the front-desk staff handling exceptions. Clinic workload reduction and willingness to pay remain hypotheses. A clinic interview and unfamiliar-user test kit is ready; no participant results are claimed.

## What it does
Open https://haoyue-dental.vercel.app/en or https://haoyue-dental.vercel.app/. Choose a fictional patient, enter a request, pick a time and review the original and proposed appointment before confirming. The saved receipt shows the change and version, and survives a page reload.

New visitors receive independent synthetic booking workspaces. Requests and spending still share account-level guards. The LINE-style screen is a web simulation, not a live LINE integration, and never creates real clinic bookings.

Patients can book, reschedule, cancel, look up appointments, read approved administrative answers or ask for staff. Explicit confusion receives rule-based guidance. Repeated requests preserve the current proposal without another inference. Symptoms and family requests are conservatively routed to a human; a handoff means a case was opened, not that someone has replied.

## Why this approach
A keyword menu is predictable but limited when wording changes. A general language model can interpret more language, but it must not decide whether a database write is valid. HAOYUE separates these jobs: a specialised model proposes intent; application code validates ownership, availability, versions and confirmation; storage commits atomically.

The public comparison uses the same fixed 64 author-written synthetic inputs: current rules 26/64, base NVIDIA 4B 52/64 and LoRA v2 58/64. Rules were rerun; model predictions were reanalysed from the recorded CUDA experiment. These are single-message intent results, not independent clinical validation or end-to-end success rates. The rule baseline includes handwritten safety routes; saved model rows do not include application safety overrides.

At score threshold 0.85, v2 accepts 54/64 inputs with one wrong accepted prediction. Scores do not authorize writes. Confirmation and deterministic validation remain necessary controls, not a guarantee that all mistakes are caught.

## How we built it
We fine-tuned NVIDIA-Nemotron-3-Nano-4B-BF16 on Colab L4 with PEFT LoRA q/v projections: rank 8 and 397,312 trainable parameters. A single forward pass projects the final hidden state onto eight intent choices. Inspired by Kev/Jev’s specialised decision direction, this does not implement Kev’s masked multi-query architecture.

The adapter runs with MLX on Apple silicon. Low-score or unavailable local inference attempts NVIDIA Nano 30B on Nebius Token Factory only when shared budget checks allow it. Expired balance verification disables paid fallback. If no valid decision is available, the app clarifies or opens a human case; it does not silently relabel rules as model inference.

Vercel and Supabase run in Tokyo. An authenticated Cloudflare Tunnel connects the demonstration Mac. Application code handles dates and doctors; explicit confirmation precedes an atomic compare-and-swap update and a fresh stored-state read. Independent demo scopes prevent visitors changing each other’s fictional appointments, while same-scope collisions and stale confirmations remain rejected.

Tavily supports administrator research: sources become drafts and require human approval before use. Patient messages never automatically search the web.

## Challenges and what we learned
The first calibration experiment made wrong predictions look too confident. We retained that failure and prohibited confidence sharpening in v2. A high-score mistake still remains, so the product makes the proposed change visible instead of treating confidence as permission.

We also found that shared demonstration patients made independent evaluation harder. New sessions now receive separate synthetic appointments. Connection errors are visible, slow requests show elapsed waiting, and an interrupted response triggers a read of saved state before a retry. The interface puts the outcome ahead of expandable technical evidence.

## Evidence and limits
The recorded v2 training/evaluation segment took 127 seconds on L4. Warmed Mac inference had a median of 53 ms, excluding network and storage. Mac and CUDA selected the same intents on all 64 inputs. The interface separately measures complete request time; these timings are not interchangeable.

Public source includes frozen predictions, comparison regeneration, training instructions, adapter hashes and transaction tests for conflicts, replay, stale confirmation and isolation. Browser verification distinguishes actual flows from explicitly injected local network failures. English is interactive, but equivalent bilingual model quality has not been established.

Codex assisted implementation, tests, GPU execution, investigation, MLX parity and development records. All experimental numbers come from saved runs.

## What’s next
Collect observations from dental front-desk staff and unfamiliar users using synthetic tasks, then revise based on actual failures. LINE and paid clinic pilots are future work with separate deployment and operating decisions. This hackathon deployment uses the existing free database and local model, has no production availability guarantee, and is intended to stop after required judging access ends.

Real patient identity, clinic-system integration, stable production model hosting, multi-clinic operations and clinical decision-making are outside this demo. Private customer-service workbooks and patient records were never included in the public training corpus.

## Source and reproduction
https://github.com/kaiwutech-TW/haoyue-dental

Adapter: https://github.com/kaiwutech-TW/haoyue-dental/releases/tag/choice-v2
