## Inspiration
"Not cancel—please change the time." A dental front desk hears corrections, worry, family requests and accidental clicks every day. A fluent chatbot reply is not enough when the outcome is an appointment. We built HAOYUE (好約) to connect understanding with a transaction people can inspect and confirm.

## What it does
Try the English demo at https://haoyue-dental.vercel.app/en or Traditional Chinese at https://haoyue-dental.vercel.app/. Choose a fictional patient, type naturally, select a slot and confirm. The simulated LINE phone sits beside actual backend events: model scores, intent, validation, confirmation and stored appointment readback. No change happens just because the model says so.

Patients can book, reschedule, cancel, check appointments, ask approved administrative questions or request a person. Explicit confusion receives patient step-by-step guidance; repeated messages retain the current proposal without another model call. Supportive wording uses transparent rules, not a claim to infer age or true emotions. Symptoms and family bookings go to a human. All data is synthetic.

## How we built it
We fine-tuned NVIDIA-Nemotron-3-Nano-4B-BF16 on a Colab L4 with PEFT LoRA (q/v projections, rank 8; 397,312 trainable parameters). One forward pass projects the last hidden state onto eight intent choices. Kev/Jev inspired the specialized decision direction; this is not Kev's masked multi-query architecture.

The same adapter runs with MLX on Apple silicon. Below a score of 0.85, or if local inference is unavailable, NVIDIA Nano 30B on Nebius Token Factory provides a budgeted fallback. If no reliable result is available, the app asks or hands off. Application code parses dates and doctors, validates typed decisions and protects every write with ownership, expiry and version checks. Supabase performs atomic compare-and-swap updates. Vercel and Supabase run in Tokyo; an authenticated Cloudflare Tunnel exposes only fixed-choice inference from the Mac.

Tavily is a staff research tool. Sources become knowledge drafts and require human review before use. Patient messages do not automatically search the web. Shared budget reservations, per-source/session limits and an administrator pause control protect public-demo credits.

## Challenges and what we learned
Our first Colab attempt spent roughly 24 minutes compiling dependencies before training began. We pinned compatible official binary wheels, proved nonzero gradients and changed adapter weights, then trained for real. The first calibration experiment made wrong predictions look too confident. We kept that failure, used a larger development set, and forbade confidence sharpening in v2.

On a fixed 64-item synthetic test, the base model scored 52/64 and v2 scored 58/64. Of 54 high-score accepted predictions, one was still wrong. These are author-written examples, not clinical validation. That is why confirmation is a product requirement rather than a confidence threshold alone.

## Accomplishments
The v2 training/evaluation segment took 127 seconds on L4. Mac inference had a warmed median of 53 ms, excluding network and database time, and matched CUDA's selected intent on all 64 test inputs. We publish the full evaluation, training recipe, hashes and Colab accounting rather than only successful screenshots. English is interactive; equivalent bilingual model performance is not established. Thirty software tests cover transaction failures, stale confirmations, repeats, language copy, model contracts and budget guards.

Codex helped implement and test the application, operate the official Colab CLI, inspect failures, port the adapter to MLX and maintain flightwake development records. Model metrics come from actual runs, not generated claims.

## What's next
Validate against authorized, de-identified conversations with clinic staff; evaluate multilingual and multi-turn generalization; improve calibrated abstention; and replace the demo tunnel with stable hosting. The current two patients are shared synthetic fixtures, not production patient identity. No private clinic workbooks or patient records were included in the public training corpus. Real care, diagnosis and medication advice are outside this demo.
