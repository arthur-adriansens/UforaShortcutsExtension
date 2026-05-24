const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");
const terser = require("terser");
const csso = require("csso");
const archiver = require("archiver");

async function run() {
    const root = process.cwd();
    const dist = path.join(root, "dist");
    await fs.remove(dist);
    await fs.mkdirp(dist);

    const manifestPath = path.join(root, "manifest.json");
    let zipName = "extension.zip";
    try {
        const manifest = await fs.readJson(manifestPath);
        const safeName = (manifest.name || "extension").replace(/[^a-z0-9_-]+/gi, "_");
        const version = manifest.version || "0.0.0";
        zipName = `${safeName}-${version}.zip`;
    } catch (err) {
        console.warn("Could not read manifest.json, using default zip name.");
    }

    const entries = glob.sync("**/*", {
        dot: true,
        nodir: true,
        ignore: [
            "node_modules/**",
            "dist/**",
            ".git/**",
            "package.json",
            "package-lock.json",
            "media/icon-64.png",
            "media/icon-256.png",
            "media/icon-512.png",
            "media/icon-1024.png",
            "media/icon-1920.png",
            "media/icon-v1.png",
            "media/icon-v2.png",
            "unused/*",
            "*.zip",
            ".gitignore",
        ],
    });

    for (const rel of entries) {
        const src = path.join(root, rel);
        const dest = path.join(dist, rel);
        await fs.mkdirp(path.dirname(dest));

        const ext = path.extname(rel).toLowerCase();
        try {
            if (ext === ".js") {
                const code = await fs.readFile(src, "utf8");
                const result = await terser.minify(code, { format: { comments: false } });
                if (result.code) await fs.writeFile(dest, result.code, "utf8");
                else await fs.copyFile(src, dest);
            } else if (ext === ".css") {
                const css = await fs.readFile(src, "utf8");
                const out = csso.minify(css).css;
                await fs.writeFile(dest, out, "utf8");
            } else {
                await fs.copyFile(src, dest);
            }
        } catch (err) {
            console.error("Failed processing", rel, err);
            await fs.copyFile(src, dest);
        }
    }

    // create zip
    const zipPath = path.join(root, zipName);
    await fs.remove(zipPath);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on("close", () => {
            console.log(`Created ${zipName} (${archive.pointer()} total bytes)`);
            resolve();
        });
        archive.on("error", (err) => reject(err));
        archive.pipe(output);
        archive.directory(dist + "/", false);
        archive.finalize();
    });
}

run().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
