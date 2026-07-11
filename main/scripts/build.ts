import pkg from "../package.json";

(async () => {
    const result = await Bun.build({
        entrypoints: ["src/index.ts"],
        outdir: "./dist",
        external: Object.keys(pkg.dependencies),
        target: "bun",
        minify: true,
    });

    if (!result.success) {
        console.error(result.logs.join("\n"));
        process.exit(1);
    }
})();
