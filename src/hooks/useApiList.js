import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "../api/client";

const initialState = () => ({
  records: [], loading: true, refreshing: false, loadingMore: false,
  error: "", hasMore: false,
});

// Independent resource states keep a failed leaderboard from hiding live games.
// Abort + sequence guards prevent stale responses overwriting newer snapshots.
export function useApiList(url, field) {
  const [state, setState] = useState(initialState);
  const controller = useRef(null);
  const sequence = useRef(0);
  const nextOffset = useRef(null);
  const busy = useRef(false);

  const load = useCallback(async (more = false) => {
    if (more && (busy.current || nextOffset.current === null)) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const version = ++sequence.current;
    busy.current = true;
    setState(previous => ({
      ...previous, error: "", refreshing: !more, loadingMore: more,
      loading: !more && previous.records.length === 0,
    }));
    try {
      const path = more ? `${url}${url.includes("?") ? "&" : "?"}offset=${nextOffset.current}` : url;
      const data = await apiJson(path, { signal: request.signal });
      if (!Array.isArray(data[field])) throw new Error("The server returned invalid list data.");
      if (request.signal.aborted || version !== sequence.current) return;
      nextOffset.current = data.has_more && Number.isSafeInteger(data.next_offset) ? data.next_offset : null;
      setState(previous => ({
        ...previous,
        records: more ? [...new Map([...previous.records, ...data[field]].map(record => [record.id, record])).values()] : data[field],
        hasMore: nextOffset.current !== null,
        error: "",
      }));
    } catch (error) {
      if (!request.signal.aborted && version === sequence.current) {
        setState(previous => ({ ...previous, error: error.message || "Unable to load data." }));
      }
    } finally {
      if (!request.signal.aborted && version === sequence.current) {
        busy.current = false;
        setState(previous => ({ ...previous, loading: false, refreshing: false, loadingMore: false }));
      }
    }
  }, [url, field]);

  const refresh = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  const replace = useCallback((records) => {
    controller.current?.abort();
    sequence.current++;
    busy.current = false;
    setState(previous => ({ ...previous, records, loading: false, refreshing: false, error: "" }));
  }, []);

  useEffect(() => {
    setState(initialState());
    nextOffset.current = null;
    refresh();
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [refresh]);

  return { ...state, refresh, loadMore, replace };
}
