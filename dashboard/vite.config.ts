import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Lets a deployment mount the app under a subpath (e.g. BASE_PATH=/dashboard/)
const base = process.env.BASE_PATH || "/";

const config = defineConfig({
    base,
    resolve: { tsconfigPaths: true },
    plugins: [
        devtools(),
        nitro({
            baseURL: base,
            preset: "bun",
            serverDir: true,
            rolldownConfig: {
                external: ["bun", /^bun:/],
            },
            devServer: {
                runner: "self",
            },
        }),
        tanstackStart(),
        viteReact(),
    ],
});

export default config;
