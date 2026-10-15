import type { NextConfig } from "next";
import { withEve } from "eve/next";

if (!process.env.VERCEL) { try { process.loadEnvFile('../.env'); } catch {} }

const nextConfig: NextConfig = {};

export default withEve(nextConfig);
