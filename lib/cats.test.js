import test from "node:test";
import assert from "node:assert/strict";
import { isUploadedCat } from "./cats.js";

test("uploaded cats are detected by createdAt", () => {
  assert.equal(isUploadedCat({ createdAt: "2026-04-22T10:00:00.000Z" }), true);
  assert.equal(isUploadedCat({ createdAt: undefined }), false);
});
