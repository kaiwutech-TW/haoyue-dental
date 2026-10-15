# HAOYUE Choice v2

- Base: `nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16`, revision `dfaf35de3e30f1867dd8dbc38a7fc9fb52d3914f`.
- Adapter SHA-256: `4940141c0e05473b3cc1bb77ea8ab341deb6183c1a6dcc4039136c8ab0fac857`.
- Architecture: eight-choice projection of the final hidden state, with PEFT LoRA on q_proj/v_proj. One forward pass; no autoregressive response generation. Not Kev's masked multi-query design.
- Intended use: fictional Taiwanese dental administrative demo; proposals require application validation and user confirmation.
- Out of scope: diagnosis, drug advice, real patient scheduling without identity verification, unattended clinical decisions.
- Training and exact reproduction: [training guide](../training/README.md).
- Data: 96 unique synthetic Traditional Chinese train utterances; 64 known development utterances; 64 newly authored, fixed test utterances. No real patient conversations. All splits share the same authoring process.
- Evaluation: CUDA 58/64 vs base 52/64. Score threshold 0.85 accepts 54/64, including one error. No claim of population accuracy, calibrated medical confidence, or independent clinical validation.
- Runtime parity: Mac MLX produced the same 64 intent choices as CUDA. Maximum probability difference 0.03612; exact numerical parity is not claimed.
- Latency: Mac warmed median 53.34 ms including tokenization, excluding all network, database and page-render latency. CUDA/MLX forward measurements must not be compared directly to Nebius API round-trip timings.
- Limitations: single-message intent only; dates/doctors are parsed by application code; multilingual and real-clinic generalization are not established. A language-specific UI does not establish model quality in that language.
- Controls: conservative symptom/human-request gates, score-based fallback, bounded requests, credential checks, transaction confirmations, expiry, ownership and conflict checks. These controls reduce specific failures; they do not prove general safety.
- License: NVIDIA base/derived weights remain subject to the NVIDIA Nemotron Open Model License; application MIT license does not relicense them. See official model card and license linked in the training guide.
- Evidence: [CUDA report](../reports/nvidia4b-choice-v2.json), [MLX report](../reports/mlx-choice-v2.json), [first-model failure](../reports/nvidia4b-challenge-v1.json), [cost record](../reports/colab-costs.json).
