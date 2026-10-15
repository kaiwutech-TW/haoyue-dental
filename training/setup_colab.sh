#!/usr/bin/env bash
set -euo pipefail
# Verified on Colab Linux x86_64, Python 3.13, NVIDIA L4. Fail rather than compile.
python3 - <<'PY'
import platform,sys
assert sys.version_info[:2]==(3,13), 'This wheel recipe requires Python 3.13; choose matching official wheels for other versions.'
assert platform.machine()=='x86_64'
PY
python3 -m pip install virtualenv
python3 -m virtualenv /content/haoyue-venv
runner=/content/haoyue-venv/bin/python
"$runner" -m pip install --only-binary=:all: torch==2.10.0 --index-url https://download.pytorch.org/whl/cu130
"$runner" -m pip install --only-binary=:all: -r training/requirements.txt
"$runner" -m pip install --no-deps --only-binary=:all: \
 'https://github.com/state-spaces/mamba/releases/download/v2.3.2.post1/mamba_ssm-2.3.2.post1%2Bcu13torch2.10cxx11abiTRUE-cp313-cp313-linux_x86_64.whl#sha256=7ac2a4ba7ba624786298c6ba184cc4db6ce027083f2c14c1429a4a2c0cb2c4cd' \
 'https://github.com/Dao-AILab/causal-conv1d/releases/download/v1.7.0/causal_conv1d-1.7.0%2Bcu13torch2.10cxx11abiTRUE-cp313-cp313-linux_x86_64.whl#sha256=e03db18b70006574a8f4206297cdeedd55d2ae1284034cb60ef9d02c4c014696'
"$runner" - <<'PY'
import torch,mamba_ssm,causal_conv1d
assert torch.cuda.is_available()
print('ENV_READY',torch.__version__,torch.cuda.get_device_name())
PY
