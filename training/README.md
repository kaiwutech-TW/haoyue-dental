# 從 Colab 訓練到 Mac 展示：NVIDIA 八選一決策模型

這份紀錄供參賽者重現。模型是 `nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16`，固定 revision `dfaf35de3e30f1867dd8dbc38a7fc9fb52d3914f`。不是把 Nebius 的 30B 權重縮小，也不是 Qwen/Kev 改名。

## 方法

1. 系統提示定義 A–H 八個行政意圖；關閉 thinking。
2. 取模型最後一個 hidden state，僅投影到 A–H 的八個 vocabulary rows。
3. 一次 forward 得到八類 logits，訓練時對正確意圖算 cross entropy。不逐字生成決策，也不生成患者答覆。
4. 只在 attention 的 `q_proj`、`v_proj` 訓練 LoRA：rank 8、alpha 16、dropout 0.05，共 397,312 個 trainable parameters。base 約 3.974B，BF16。
5. v2 採 AdamW、learning rate 5e-5、label smoothing 0.05、gradient clipping 1、seed 42。96 個不同句子，batch 1、4 epochs／384 steps；依 64 題開發驗證 NLL 選出 epoch 3，最後才跑 64 題新測試。
6. temperature 只在驗證集選擇且限制 ≥1，v2 結果為 1.0。模型分數 <0.85 走 Nebius 後備或澄清。日期／醫師是程式解析，交易須患者確認；模型分數不代表已證明的正確機率。

此形式借鏡 Jev/Kev 的專用決策模型概念，**沒有重現 Kev 的 masked multi-query attention**。目前只做單句意圖分類，多輪與模糊情況由應用及 Nebius 處理。

## 環境與踩坑

實測 GPU：Colab Pro NVIDIA L4，23034 MiB VRAM、約 53 GB 系統 RAM。沒有購買額外點數。GPU peak tensor allocation 約 8.33 GB，並非整台 GPU 的總占用。

Colab 預設 Python 3.13 + torch 2.11/cu130 沒有本次需要的相容 Mamba wheel；初次 pip 安裝轉成 CUDA 原碼編譯，約 24 分鐘仍未訓練。`use_mamba_kernels=False` 也不能移除模型對 Mamba RMSNorm 的 import。

解法是在隔離環境固定 torch 2.10.0+cu130，使用官方 cp313、cu13、torch2.10 的 `mamba-ssm 2.3.2.post1` 與 `causal-conv1d 1.7.0` binary wheels，附 SHA-256。安裝禁止默默 fallback 到編譯。完整已驗證套件版本見 [environment](../reports/nvidia4b-environment.txt)。

```bash
# 在 Colab 的專案目錄，例如 /content/haoyue
bash training/setup_colab.sh
/content/haoyue-venv/bin/python -m training.gpu_runner
# 先確認 BACKWARD_OK、weightChanged=true，再跑完整 v2：
timeout --signal=TERM --kill-after=30s 1200 \
  /content/haoyue-venv/bin/python -u -m training.train_v2
```

`setup_colab.sh` 固定 Python 3.13／Linux x86_64；未來 Colab 換版本時，先選官方匹配 wheel，不要直接刪掉檢查或無限等編譯。

## 使用官方 Colab CLI

[官方 CLI](https://github.com/googlecolab/google-colab-cli) 與 [operator skill](https://github.com/googlecolab/google-colab-cli/blob/main/skills/colab-operator/SKILL.md) 可直接上傳程式、讀 log、下載 artifacts。OAuth 使用官方登入流程，憑證只存在本機 repo 外；不要把授權碼或 session token 放進 notebook／git。

```bash
uv tool install google-colab-cli==0.7.4
colab sessions # 首次依官方 skill 設定 OAuth client，並完成登入
colab usage
# 只有沒有現有專案 GPU 時，才建立；會消耗方案 compute units：
colab new -s haoyue-l4 --gpu L4
python3 scripts/package-training.py
colab upload -s haoyue-l4 artifacts/training-input.zip /content/training-input.zip
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=prepare
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=setup
# monitor 直到 ENV_READY，再依次 smoke → monitor BACKWARD_OK → train：
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=monitor
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=smoke
# 確認 smoke 成功之後：
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=train
# monitor 直到 FINISHED，再 export：
colab exec -s haoyue-l4 -f training/colab_job.py --env HAOYUE_JOB_ACTION=export
colab download -s haoyue-l4 /content/haoyue-choice-v2.zip artifacts/haoyue-choice-v2.zip
# 先驗證下載 hash，再停止：
colab stop -s haoyue-l4
colab sessions
colab usage
```

以上操作由 [colab_job.py](colab_job.py) 實作；上傳前先建立遠端父資料夾。現有網頁建立的 runtime 可能在 CLI 顯示 `[?]`，不要因此另開第二台。`status=IDLE` 也不保證背景 subprocess 停止，必須看 log、程序及 `nvidia-smi`。

## 時間、點數與實測結果

| 階段 | 實測時間 | 備註 |
|---|---:|---|
| 第一次依賴編譯，後中止 | 約 1463 秒 | 尚未開始模型訓練 |
| 首次 forward/backward smoke | 102.28 秒 | 包含首次 kernel 編譯；非每一步都要這麼久 |
| v1 訓練與評測區段 | 64.14 秒 | 192 steps；96 rows 其實僅 24 個句子加禮貌前綴 |
| v2 訓練與評測區段 | 127.13 秒 | 384 steps；96 個不同訓練句 |
| Mac v2 單次推論中位數 | 53.34 毫秒 | 64 題 warmed test，含 tokenization、不含網路 |

當時 L4 費率 **1.54 compute units／小時**。較早觀察的餘額約 **199.60**，所有本專案 GPU 關閉後為 **197.99**，差額約 **1.61 點**，包含依賴、載入、驗證、等待及另一個後續專案 runtime。沒有供應商逐 job 帳單，所以**不是「一次微調花 1.61 點」**。僅將兩次訓練／評測區段按該費率換算約 **0.082 點**，是估算。停止後再次確認 active assignments=0、usage rate=0.00/hr。原始數據見 [costs](../reports/colab-costs.json)。

v2 新合成測試：base **52/64**，LoRA **58/64**。分數門檻 0.85 接受 **54 題**，其中 **1 題錯誤**。第一次模型在另一組 64 題診斷挑戰有過度自信問題；兩組題不同，不能直接比較錯誤數下降幅度。

資料來自作者編寫的虛構台灣客服句子，無真實患者資料。開發驗證是已看過的 v1 challenge；v2 test 在 v2 最佳化前固定並 hash。這不是外部獨立或臨床驗證。原始來源、split、hash 與重建檢查：

```bash
python3 training/rebuild_v2.py --check
```

- [CUDA v2 完整報告](../reports/nvidia4b-choice-v2.json)
- [Mac parity 報告](../reports/mlx-choice-v2.json)：64/64 意圖與 CUDA 一致，但 BF16/kernel 差異使機率最多相差約 0.036，不宣稱數值逐位相同。
- [第一版失敗證據](../reports/nvidia4b-challenge-v1.json)

## Mac 服務與部署

本機使用 MLX 原生 `nemotron_h`，載入同一個官方基礎 revision，將 PEFT 的 A/B 矩陣接到相同層，保留 BF16 base 與獨立 LoRA 運算，無額外量化。先驗證 artifact manifest，再推論。

```bash
uv venv --python 3.13 .venv-mlx
uv pip install --python .venv-mlx/bin/python -r inference/requirements.txt
# 基礎權重由官方 HF snapshot_download 固定 revision 取得，放 artifacts/models/nemotron4b
# adapter 放 artifacts/haoyue-choice-v2；憑證 DECISION_ADAPTER_KEY 放忽略的 .env
.venv-mlx/bin/python -m inference.evaluate_mlx
python3 scripts/run-choice-server.py
```

架構：瀏覽器 → Vercel 東京後端 → 驗證金鑰的 Cloudflare Tunnel → Mac `127.0.0.1:8766/decision`；Supabase 東京存預約。公開頁面不持有 adapter 或 Nebius 金鑰。只允許有長度上限的文字分類，沒有任意工具／檔案 API，並限制並行、速率及付費後備預算。

Cloudflare Quick Tunnel 目前供 demo 使用；沒有 uptime SLA，重新啟動會換網址。正式穩定部署應用 named tunnel／自訂網域或支援此模型的受管服務。Mac 必須維持開機連網，離線／逾時會被 trace 明示並嘗試受預算約束的 Nebius 後備。不要將 Colab 當長期線上服務。

Nebius 查核見 [hosting evidence](../reports/nebius-hosting-check.json)：帳號可見 43 個 dedicated templates 沒有此 4B，custom weights beta 需申請；未確認活動額度可否用於 dedicated GPU，所以沒有建立付費 endpoint。

## 授權

程式與合成語句依根目錄 LICENSE；NVIDIA 基礎模型及衍生 adapter 另受 [NVIDIA Nemotron Open Model License](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-nemotron-open-model-license/) 約束。公開權重時須保留模型來源、授權與使用限制，不能把它們改稱 MIT。

## 公開來源與權重

[完整程式與報告](https://github.com/kaiwutech-TW/haoyue-dental)；[v2 adapter release 與 SHA256SUMS](https://github.com/kaiwutech-TW/haoyue-dental/releases/tag/choice-v2)。release ZIP 附 NVIDIA 授權副本，未包含基礎 8 GB 權重。程式的 MIT 授權不會重新授權模型資產。
