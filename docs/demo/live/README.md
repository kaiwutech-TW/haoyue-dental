# Actual functioning footage

The organizer requested actual footage of the project functioning on its target device. The former still-image montage is retained as history. This replacement is a genuine browser recording of the deployed application on the demonstration Mac, with normal elapsed time, real NVIDIA model responses and real Supabase transactions. It runs 141.64 seconds, below three minutes.

Publication status is tracked in [the verification report](../../../reports/live-demo-video.json). The [public video](https://youtu.be/AAXcRB4OPtQ) is embedded in the existing Devpost submission. Playback advanced past 21 seconds and reload retained the new ID and submitted event association. AI-use disclosure was updated and read back. This verifies delivery, not organizer acceptance.

## What the video demonstrates

English free text reaches the fine-tuned NVIDIA 4B LoRA model. The original v12 booking stays unchanged while a new slot is proposed. An identical repeated message preserves that proposal and skips model calls. Explicit confirmation produces the stored v13 booking. Patient guidance uses transparent rules; requesting a person opens a real case without a fabricated staff reply. Mandarin free text then reaches the same adapter. All patients and bookings are synthetic.

The film reuses the fact-checked second NotebookLM narrator generation. It includes English burned captions and [an SRT](haoyue-live-en.srt), synchronized to the recorded chapter starts. No new speech generation, model fine-tuning or paid GPU session was needed. The original captions' proper-name corrections remain documented in the [voice workflow](../voice-workflow.md).

## Reproduction

The participant explicitly authorized Playwright browser automation and recording. Install its tooling separately from the app:

```sh
npm install --prefix artifacts/video-live/tooling --no-audit --no-fund playwright@1.64.1
artifacts/video-live/tooling/node_modules/.bin/playwright install ffmpeg
node scripts/record-live-demo.mjs
node scripts/build-live-demo.mjs
ffmpeg -v error -i artifacts/video-live/playwright/haoyue-live-en.mp4 -f null -
```

Google Chrome must be installed. The script opens an isolated browser context without importing the user's cookies or login state. It operates the real public site and changes only shared synthetic bookings; it is not a unit test or a mocked replay. Do not repeatedly run it for cosmetic retakes: normal source/session limits and budget guards remain in force.

Raw video, failed takes and full captures remain ignored under `artifacts/video-live/`. [Sanitized action/response evidence](../../../reports/live-recording.json) contains actual model identities, scores, timing, versions and transaction assertions, without session cookies. The editor uses a continuous, normal-speed source track; it trims startup before the first chapter, crops the viewport and adds explanatory text. It does not reconstruct operation scenes from static screenshots or insert generated response frames.

One earlier Playwright take encountered a data-service error and was rejected. A subsequent direct store read returned HTTP200 and the full recorded run passed; this does not establish a permanent fix or an uptime guarantee. Original native-window recording probes were also kept locally, but are not the final source.
