/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
// NEXT_DIST_DIR memungkinkan build uji terpisah tanpa mengganggu `next dev` yang sedang berjalan.
const config = { distDir: process.env.NEXT_DIST_DIR ?? ".next" };

export default config;
