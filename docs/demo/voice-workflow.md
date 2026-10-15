# Narration production and quality review

The first published edit used macOS Samantha. After reviewing it, the participant requested a more expressive voice. No concierge inference models or budgets changed for this media task.

## OpenAI attempt

The installed Codex CLI has no direct speech-output command, and the environment had no OpenAI API key. A native-browser attempt on the official OpenAI.fm demo returned its daily 20-generation limit; no audio was downloaded and the limit was not bypassed.

An optional API script is provided for reproducibility, but **has not generated project audio**:

```sh
node scripts/generate-demo-speech.mjs --check
node scripts/generate-demo-speech.mjs --scene 01-intro
node scripts/generate-demo-speech.mjs --all
node scripts/build-demo-video.mjs --openai
```

This uses `gpt-4o-mini-tts`, `marin`, the official Speech API and an ignored `OPENAI_API_KEY`. Matching cached scenes are reused. Requests are reserved before calling, errors retain the reservation, and no automatic retry occurs. The local $0.25 reservation ceiling is a conservative workflow guard, not an account-wide provider spending cap or measured bill. Consult current [official Speech documentation](https://developers.openai.com/api/docs/guides/text-to-speech) for availability and pricing.

## NotebookLM route

The participant instead chose their already-open NotebookLM (Gemini Notebook) web app. A new private notebook contains only the approved public narration; no private clinic materials were uploaded. Audio Overview was set to Brief / English with a single narrator and explicit factual instructions.

The first 1:35 generation sounded more natural but added hyperbole and omitted the synthetic-data and latency conditions. It was rejected for publication. A revised generation requests the exact 52/64 → 58/64 synthetic result, accepted error, network-excluded warmed timing and fictional patients, without analogies or sales language. The revised 1:53 audio passed factual review and was cut into eight chapters. The resulting 1:59 edit passed full decoding and a visual contact-sheet review; it was publicly published on the user-confirmed KaiWuTech channel, with a selectable English subtitle track. Final publication status is recorded in the media verification report.

## Local transcript review

Use a separate environment; do not change the live NVIDIA classifier's Python environment:

```sh
uv venv .venv-narration --python 3.12
uv pip install --python .venv-narration/bin/python mlx-whisper==0.4.3
HF_HUB_DISABLE_IMPLICIT_TOKEN=1 .venv-narration/bin/python scripts/transcribe-demo.py AUDIO OUTPUT.json
```

This runs OpenAI Whisper base.en with MLX on the Mac. It helps locate words and align captions; ASR proper-name errors must be corrected against the actual speech and source. NotebookLM audio is a summary, not guaranteed verbatim TTS. Check every numerical or clinical claim before editing it into the real product captures. The build refuses edits at or above 179 seconds. Raw audio and full-window screenshots stay outside the public source snapshot.
