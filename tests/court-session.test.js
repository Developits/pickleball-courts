import test from "node:test";
import assert from "node:assert/strict";
import { getShanghaiDateTime } from "../functions/api/utils/courtSession.js";

test("court date changes at Shanghai midnight rather than UTC midnight", () => {
  assert.deepEqual(getShanghaiDateTime(new Date("2026-06-19T15:59:59Z")), { date: "2026-06-19", time: "23:59:59" });
  assert.deepEqual(getShanghaiDateTime(new Date("2026-06-19T16:00:00Z")), { date: "2026-06-20", time: "00:00:00" });
});
