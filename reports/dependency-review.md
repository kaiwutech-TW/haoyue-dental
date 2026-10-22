# Dependency review — 2026-10-22

Deployment preparation surfaced 10 npm audit findings (8 low, 1 high, 1 critical). A narrow update pins Next.js to 16.3.8 and NanoID to 5.1.16. The resulting audit reports **8 low, 0 moderate, 0 high, 0 critical**. This is a point-in-time dependency scan, not a claim that the application has no vulnerabilities.

Primary advisories reviewed:

- [Next.js next/og SVG processing](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). The app's Apple icon passes static JSX to ImageResponse; no attacker-controlled SVG input was found in that route.
- [Next.js image optimizer private-network requests](https://github.com/advisories/GHSA-cjq9-62q9-8jv4). The app config has no remotePatterns setting. The patched version is applied regardless.
- [NanoID non-secure negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv). Existing UI calls use default size; no caller-supplied negative size was found.

The eight remaining low findings are in the KaTeX/math/mermaid/Streamdown dependency chain. The dental conversation renders plain text; the generic agent UI routes are disabled publicly. These findings are retained for review rather than forcing unrelated major dependency changes during the demo release. Reassess before exposing rich Markdown or re-enabling the generic UI.

Validation after the updates: 35 unit tests passed; TypeScript and production build passed. Deployed acceptance is recorded separately in `readiness-deployed.json`.
