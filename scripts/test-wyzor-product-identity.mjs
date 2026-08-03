import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tauriConfigUrl = new URL(
  "../desktop/src-tauri/tauri.conf.json",
  import.meta.url,
);
const infoPlistUrl = new URL("../desktop/src-tauri/Info.plist", import.meta.url);

test("packaged desktop identity is isolated from official Buzz", async () => {
  const config = JSON.parse(await readFile(tauriConfigUrl, "utf8"));
  const infoPlist = await readFile(infoPlistUrl, "utf8");

  assert.equal(config.productName, "Wyzor Ops Mesh");
  assert.equal(config.identifier, "ai.wyzor.opsmesh");
  assert.deepEqual(config.plugins["deep-link"].desktop.schemes, ["wyzor-mesh"]);

  assert.match(
    infoPlist,
    /<key>CFBundleDisplayName<\/key>\s*<string>Wyzor Ops Mesh<\/string>/,
  );
  assert.match(
    infoPlist,
    /<key>CFBundleName<\/key>\s*<string>Wyzor Ops Mesh<\/string>/,
  );
  assert.doesNotMatch(infoPlist, /<string>Buzz needs /);
});
