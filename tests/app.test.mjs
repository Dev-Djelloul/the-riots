import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { test } from "node:test";

test("frontend module parses before deployment", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const scriptSource = source.replace(/^import\s+.+?;\s*$/gm, "");

  assert.doesNotThrow(() => new Script(scriptSource, { filename: "app.js" }));
});
