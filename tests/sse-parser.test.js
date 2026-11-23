import test from "node:test";
import assert from "node:assert/strict";
import { createSSEParser } from "../src/utils/sse.js";

test("SSE parser keeps events intact across every possible two-chunk boundary", () => {
  const input = 'event: update\ndata: {"courts":[]}\n\nevent: connected\ndata: {}\n\n';
  const expected = [
    { event: "update", data: '{"courts":[]}' },
    { event: "connected", data: "{}" },
  ];
  for (let boundary = 0; boundary <= input.length; boundary++) {
    const events = [];
    const parse = createSSEParser(event => events.push(event));
    parse(input.slice(0, boundary));
    parse(input.slice(boundary));
    assert.deepEqual(events, expected, `boundary ${boundary}`);
  }
});

test("SSE parser handles CRLF, comments, multi-line data, and default event types", () => {
  const events = [];
  const parse = createSSEParser(event => events.push(event));
  for (const character of ': keepalive\r\nevent: update\r\ndata: {\r\ndata: "ok":true}\r\n\r\ndata: plain\r\n\r\n') parse(character);
  assert.deepEqual(events, [
    { event: "update", data: '{\n"ok":true}' },
    { event: "message", data: "plain" },
  ]);
});
