# Historical English montage and reusable narration

This 1:59 edit combines real production captures with a NotebookLM synthetic narrator. The revised voiceover was checked for accuracy: all patients/bookings are synthetic; the 64-item Mandarin test and accepted error remain explicit; warmed 53 ms excludes network/database and is not clinical validation; English accuracy equivalence is not claimed.

Status: **superseded in the submission by the [real working recording](../live/README.md)**. This historical montage remains public on KaiWuTech: https://youtu.be/bx7hE5PcGok. YouTube displays 2:00 for the 119.333-second file. Copyright checks reported no issues; the reviewed English SRT was imported, then published from Studio. The public watch page still reported captions unavailable during verification, so selectable-track availability is pending. Burned captions remain visible in the video.

The first NotebookLM draft was rejected for added hyperbole and omitted qualifications. The second Brief/English generation is the source for this published edit. No OpenAI Speech API call generated this voice. Local OpenAI Whisper/MLX supplied word timestamps for captions; proper-name spelling was corrected against the project source.

To reproduce from the exact local download (hash in the manifest):

```sh
HF_HUB_DISABLE_IMPLICIT_TOKEN=1 .venv-narration/bin/python scripts/transcribe-demo.py artifacts/video-notebooklm/narration-v2.m4a artifacts/video-notebooklm/transcription-v2.json
python3 scripts/prepare-notebooklm-edit.py
node scripts/build-demo-video.mjs --notebooklm
ffmpeg -v error -i artifacts/video-notebooklm/haoyue-demo-en.mp4 -f null -
```

The source audio, raw screenshots and generated MP4 remain in ignored local artifacts. [Scenes](scenes.json), [transcript](transcript.md), [captions](haoyue-demo-en.srt) and [voice manifest](voice-manifest.json) preserve the reviewed edit. No private clinic material was added to NotebookLM. Eight semantic cuts add 0.8 seconds of space each; the 112.919-second source becomes a 119.333-second video.
