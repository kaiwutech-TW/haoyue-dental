# Deployment and recovery

The public Next.js app and Supabase database run in Tokyo (`hnd1` and `ap-northeast-1`). The fine-tuned NVIDIA 4B model runs locally on Apple silicon using MLX. Nebius Token Factory supplies NVIDIA 30B fallback. See the model card for why the 4B weights are not hosted on Nebius.

## Application

Node 24+, `cd app && npm ci`. Configure server-only environment variables from `.env.example`. Never place secrets in `NEXT_PUBLIC_*`. Run tests, typecheck and build before deploying. `app/vercel.json` fixes the function region to Tokyo. `scripts/deploy-source.py` generates a source manifest excluding local secrets, caches and weights.

Supabase uses the migration under `supabase/migrations` and the private `clinic-store` Edge Function. Set the SHA-256 digest of your own high-entropy store key when deploying that function; do not reuse this project's credentials. The browser never receives database service credentials. Public anonymous reads and writes are denied; the service uses atomic compare-and-swap transactions.

## Inference service

Follow `training/README.md` for the base weights, verified v2 adapter, MLX environment and standalone service. `scripts/run-choice-server.py` passes only the adapter key to Uvicorn. The local service listens on loopback port 8766; all routes require bearer authentication. Only health and fixed-choice inference are exposed. No general tool execution or file access is exposed.

For an always-on demo, `scripts/supervise-choice.py` starts the service and Cloudflare Quick Tunnel, checks the exact adapter hash on the authenticated local endpoint, waits for cloudflared to confirm edge connectivity, then updates `Clinic.inferenceEndpoint` using the existing private CAS API. This field is excluded from patient/staff views. The app accepts registered URLs only under `https://*.trycloudflare.com/decision`. The demonstration service uses IPv4 and HTTP/2 after QUIC preflight failures; TLS and bearer authentication remain enabled. A restarted tunnel can change URL without redeploying Vercel. In-flight requests may fail during recovery and use guarded fallback or handoff.

On the demonstration Mac, a dedicated snapshot lives under `~/Library/Application Support/HAOYUE/runtime`, with a mode-0600 `.env` containing only the adapter/store keys and Supabase URL. A user LaunchAgent `com.kaiwu.haoyue-choice` runs it through `caffeinate -i`, preventing idle sleep while the service runs. It restarts after process exit and starts at user login, not before login after a reboot. This does not keep the network online after power loss or deliberate sleep. Changes to inference code require refreshing that dedicated snapshot.

Inspect:
```sh
launchctl print gui/$(id -u)/com.kaiwu.haoyue-choice
tail -20 "$HOME/Library/Application Support/HAOYUE/runtime/artifacts/private/supervisor.log"
```
Stop only this project:
```sh
launchctl bootout gui/$(id -u)/com.kaiwu.haoyue-choice
```
Start the existing installation:
```sh
launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/com.kaiwu.haoyue-choice.plist"
```

Quick Tunnels are for demonstration, not an uptime guarantee. A stable production deployment should use a managed endpoint or a named authenticated tunnel and a proper operational owner.

## Spending controls

Local inference has shared source/session rate limits without a Nebius charge. Paid fallback must first reserve US$0.02 atomically, including failures. Current project limits are US$1 total and US$0.40/day, additionally bounded by a verified account balance minus the user's US$5 reserve. A balance snapshot expires after 24 hours. Verify the actual Nebius balance before refreshing it; never just advance the timestamp. These controls cannot govern other applications using the same account. Tavily is admin-only.

## Verification

`scripts/integration.mjs` exercises query, proposal, commit, replay, handoff and staff reply. It changes only synthetic demo data. `EXPECTED_REGION=hnd1 EXPECT_CHOICE=1` verifies the deployed region and real adapter evidence. The bilingual tests also verify English copy, dates, safety routes and repeat suppression. No real clinic credentials or patient data should ever be used in this demo.

## Hackathon readiness and end of service

This deployment is a temporary hackathon demonstration on existing resources. No database plan upgrade or cloud GPU is part of the readiness work. The later LINE/paid-clinic experiment needs a separate deployment decision.

The official rules currently require test access through the judging period, ending December 15, 2026 in Pacific time. Do not equate the submission deadline with the end of required testing. After required access ends, disable model calls and stop the project LaunchAgent using the commands above. Keep the source, recorded evidence and submission association. Deleting the database or project is a separate destructive action and is not part of this plan.

Read-only readiness check from the repository root:

```sh
node --env-file=.env --experimental-strip-types scripts/check-readiness.mjs
```

It reports database access, authenticated local-model health/hash and whether a fallback reservation would currently be allowed. It never performs inference, commits a reservation, refreshes balance verification or prints credentials. Only update the balance and its verification timestamp after observing the real authenticated billing page. Preserve the US$5 account reserve and existing project/daily caps. A US$0.02 reservation is a conservative allowance, not an invoice charge.

For a real sponsor API check, explicitly run `DECISION_MODE=nebius node --env-file=.env --experimental-strip-types scripts/verify-nebius-fallback.mjs`. This **does** reserve shared budget and make one real API call. Do not run it as a periodic health check. Its report separates token usage from unknown invoiced cost.

New public sessions use independent synthetic scopes within the existing JSON store; no SQL schema migration is needed. Existing shared sessions still work and are labelled as legacy. Global spending and source limits do not reset when a visitor starts a new session. The 1,000-session demo cap remains; this single-store architecture is not multi-clinic production infrastructure.

## Browser verification

Use an isolated local SQLite file and rule mode for fault-injection checks; never use the production database for injected failures. Set `APP_ORIGIN` to the exact local origin:

```sh
cd app
APP_ORIGIN=http://127.0.0.1:3010 DECISION_MODE=rule SUPABASE_URL='' CLINIC_DB_PATH=/tmp/haoyue-local-verification.sqlite npm run dev -- --port 3010
```

In another terminal, install test-only tooling into the ignored directory and run from the repository root:

```sh
npm install --prefix artifacts/video-live/tooling playwright @axe-core/playwright
FAULTS=1 node scripts/verify-readiness.mjs
```

The script uses a fresh browser profile, never imported logins. It checks independent visitors, receipts, replay, handoff, keyboard/contrast and responsive layouts. Faults are separately labelled and restricted to localhost. For deployed verification use `TEST_URL=https://haoyue-dental.vercel.app EXPECT_CHOICE=1 node scripts/verify-readiness.mjs`; this exercises the real model and global limits. Reports and screenshots initially stay under ignored `artifacts/private/readiness/`; publish only reviewed, sanitised reports. Automated accessibility scanning is not a full accessibility audit.
