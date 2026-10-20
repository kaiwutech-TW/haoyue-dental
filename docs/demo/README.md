# Demonstration video

Current public edit: [HAOYUE — Live Working Demo](https://youtu.be/AAXcRB4OPtQ), 141.64 seconds (2:22), on KaiWuTech. A continuous, normal-speed recording shows real English/Mandarin input, NVIDIA decisions, explicit confirmation and Supabase readback. It reuses reviewed NotebookLM narration and includes burned English captions. [Recording recipe and evidence](live/README.md). The new embed played on Devpost and survived reload with the existing submitted event association. Organizer acceptance remains unconfirmed.

## Historical NotebookLM montage

The [119-second edit](https://youtu.be/bx7hE5PcGok) remains public as history. Its [voice recipe](notebooklm/README.md) supplies the replacement narration; it is no longer the submitted demo.

## Earlier edit

The English edit is 2:27, 1920×1080 H.264/AAC, with English burned captions and synthetic Samantha narration. It is a programmatic montage of real public-app captures, not a continuous screen recording. Explanatory labels distinguish current request timings from warmed benchmark measurements. All appointments are synthetic.

Build on macOS after installing the app dependencies and FFmpeg:

```sh
node scripts/build-demo-video.mjs
```

Source window captures live in ignored `artifacts/video/source/` and must be freshly collected through native Computer Use. Browser chrome and unrelated personal UI are cropped out before rendering. Audio is generated with the macOS built-in Samantha voice; no voice cloning or cloud TTS is used. Raw screenshots and generated media remain outside the public source snapshot.

See [transcript](transcript.md), [captions](haoyue-demo-en.srt), [scene recipe](scenes.json), and [verification report](../../reports/demo-video.json). Captions use phrase-length timing estimates, not forced alignment. The SHA-256 report ties the edit to the source captures and final output.

YouTube: https://youtu.be/sUw0jwCE5TM (published as unlisted on the user-confirmed KaiWuTech channel).

## Capture inputs

The recipe expects 3840×1952 native Chrome window captures with the app at its default zoom. Files under local `artifacts/video/source/`: `01-start.png`, `02-intent.png`, `03-proposal.png`, `04-repeat.png`, `05-committed.png`, `06-guidance.png`, `07-handoff.png`, `08-chinese.png`. Only app-content regions enter the published video. The screenshot service may encode JPEG bytes despite the `.png` filename; Sharp detects the actual format. These inputs are real UI evidence, not generated mockups.

## Voice production

See [voice production decisions](voice-workflow.md) for the reviewed NotebookLM workflow and rejected first generation. The Samantha link above is retained only as the earlier edit.
