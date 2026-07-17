import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Lets a deployment mount the app under a subpath (e.g. BASE_PATH=/dashboard/)
// without touching source. Must be an absolute path (leading slash), not a
// relative "./" — TanStack Start derives its server-fn RPC route prefix
// (TSS_SERVER_FN_BASE) from this same value, and a relative value produces a
// literal "/./_serverFn/" prefix that the server's route matcher never
// matches (incoming requests get normalized to "/_serverFn/" first), so every
// server-fn call falls through to the page router and fails with "Only HTML
// requests are supported here". The /assets, /favicon.ico, etc. references
// throughout the app go through import.meta.env.BASE_URL, which reflects
// whatever's configured here, so an absolute base works for those too.
const base = process.env.BASE_PATH || "/";

const config = defineConfig({
    base,
    resolve: { tsconfigPaths: true },
    plugins: [
        devtools(),
        nitro({
            preset: "bun",
            serverDir: true,
            rolldownConfig: {
                external: ["bun", /^bun:/],
            },
            // Default dev runner ("node-worker") executes server code in a plain
            // Node worker thread, which can't resolve the "bun" built-in module
            // that server/plugins/init.ts imports. "self" runs server code inside
            // this same process instead of spawning a worker/subprocess, so as
            // long as `vite dev` itself is launched with the bun binary, that
            // import resolves like it does in the "bun" build preset. (The
            // "bun-process" runner would also work in principle, but its Windows
            // bun-path resolution is broken under a Git Bash / MSYS shell.)
            devServer: {
                runner: "self",
            },
        }),
        tanstackStart(),
        viteReact(),
    ],
});

export default config;
