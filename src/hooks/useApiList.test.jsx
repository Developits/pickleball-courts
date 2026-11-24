import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useApiList } from "./useApiList";

const api = vi.hoisted(() => vi.fn());
vi.mock("../api/client", () => ({ apiJson: api }));
beforeEach(() => { api.mockReset(); });
afterEach(cleanup);

it("ignores an old response after the history filter changes, even if transport ignores abort", async () => {
  const pending = {};
  api.mockImplementation(url => new Promise(resolve => { pending[url] = resolve; }));
  const hook = renderHook(({ url }) => useApiList(url, "matches"), { initialProps: { url: "/history?scope=all" } });
  hook.rerender({ url: "/history?scope=mine" });
  await act(async () => { pending["/history?scope=mine"]({ matches: [{ id: 2 }] }); });
  expect(hook.result.current.records).toEqual([{ id: 2 }]);
  await act(async () => { pending["/history?scope=all"]({ matches: [{ id: 1 }] }); });
  expect(hook.result.current.records).toEqual([{ id: 2 }]);
});

it("does not let a stale REST response overwrite a newer live snapshot", async () => {
  let resolve;
  api.mockImplementation(() => new Promise(done => { resolve = done; }));
  const hook = renderHook(() => useApiList("/live", "matches"));
  act(() => hook.result.current.replace([{ id: 3 }]));
  await act(async () => { resolve({ matches: [{ id: 1 }] }); });
  expect(hook.result.current.records).toEqual([{ id: 3 }]);
  expect(hook.result.current.loading).toBe(false);
});

it("aborts outstanding requests when the view unmounts", () => {
  let signal;
  api.mockImplementation((_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const hook = renderHook(() => useApiList("/live", "matches"));
  expect(signal.aborted).toBe(false);
  hook.unmount();
  expect(signal.aborted).toBe(true);
});
