## Inspiration
“Not cancel—please change the time.” A dental front desk hears corrections, worry, family requests and accidental clicks every day. A fluent reply is not enough when the outcome is an appointment. HAOYUE (好約) connects understanding with an action people can inspect and confirm.

## What it does
Try the English demo at https://haoyue-dental.vercel.app/en or Traditional Chinese at https://haoyue-dental.vercel.app/. Choose a fictional patient, type naturally, select a slot and confirm. A simulated LINE phone sits beside actual backend events: model scores, intent, validation, confirmation and stored appointment readback.

Patients can book, reschedule, cancel, check appointments, ask approved administrative questions or request a person. Explicit confusion receives step-by-step guidance. Repeated messages preserve the current proposal without another model call. Supportive wording uses transparent rules; it does not infer age or true emotion. Symptoms and family bookings go to a human. All patient data is synthetic.

## How we built it
We fine-tuned NVIDIA-Nemotron-3-Nano-4B-BF16 on a Colab L4 using PEFT LoRA on q/v projections: rank 8 and 397,312 trainable parameters. One forward pass projects the last hidden state onto eight intent choices. Kev/Jev inspired the specialized decision direction; this does not implement Kev’s masked multi-query architecture.

The same adapter runs with MLX on Apple silicon. Below a score of 0.85, or when local inference is unavailable, NVIDIA Nano 30B on Nebius Token Factory provides budgeted fallback. If no valid result is available, the app clarifies or hands off. Application code parses dates and doctors, validates typed decisions and protects writes with ownership, expiry and version checks. Supabase performs atomic compare-and-swap updates. Vercel and Supabase run in Tokyo; an authenticated Cloudflare Tunnel exposes fixed-choice inference from the Mac.

Tavily supports staff research. Sources become knowledge drafts and require human approval before use. Patient messages do not automatically search the web. Shared budget reservations, source/session limits and an administrator pause control protect public-demo credits.

## Challenges and what we learned
Our first Colab attempt spent roughly 24 minutes compiling dependencies before training began. We pinned compatible official binary wheels, proved nonzero gradients and changed adapter weights, then trained for real. The first calibration experiment made wrong predictions look too confident. We kept that failure, used a larger development set and forbade confidence sharpening in v2.

On a fixed 64-item synthetic test, the base model scored 52/64 and v2 scored 58/64. Of 54 high-score accepted predictions, one was still wrong. These author-written examples are not clinical validation. Confirmation is therefore a product requirement, not something a confidence threshold replaces.

## Accomplishments
The v2 training/evaluation segment took 127 seconds on L4. Warmed Mac inference had a median of 53 ms, excluding network and database time, and matched CUDA’s selected intent on all 64 test inputs. Full evaluation reports, hashes, training instructions and Colab accounting are public. English is interactive; equivalent bilingual model performance has not been established. Thirty software tests cover transaction failures, stale confirmations, repeats, language copy, model contracts and budget guards.

Codex helped implement and test the app, operate the official Colab CLI, investigate failures, port the adapter to MLX and maintain flightwake development records. Experimental numbers come from actual runs.

## What’s next
Validate with authorized, de-identified clinic conversations; evaluate multilingual and multi-turn generalization; improve abstention; and replace the demo tunnel with stable hosting. The two patients are shared synthetic fixtures, not production patient identity. Private customer-service workbooks and patient records were not included in the public training corpus. Diagnosis, medication advice and real clinical scheduling are outside this demo.

## Source and reproduction
https://github.com/kaiwutech-TW/haoyue-dental

Adapter release: https://github.com/kaiwutech-TW/haoyue-dental/releases/tag/choice-v2
