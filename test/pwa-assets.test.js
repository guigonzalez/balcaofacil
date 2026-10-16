import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("PWA manifest supports standalone installation with required icons", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "public/manifest.webmanifest"), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "pt-BR");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");

  for (const size of [192, 512]) {
    const icon = manifest.icons.find(item => item.sizes === `${size}x${size}` && item.purpose === "any");
    assert.ok(icon, `missing ${size}px standard icon`);
    const png = await readFile(path.join(root, "public", icon.src.replace("./", "")));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }

  assert.ok(manifest.icons.some(icon => icon.purpose === "maskable"));
});
