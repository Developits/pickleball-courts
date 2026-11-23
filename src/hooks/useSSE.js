import { useState, useEffect, useRef } from "react";
import { createSSEParser } from "../utils/sse.js";

/**
 * SSE hook using fetch + ReadableStream instead of the native EventSource API.
 *
 * WHY NOT EventSource?
 *  EventSource doesn't support custom headers, which would force us to expose
 *  the JWT token as a URL query parameter (?token=...) — visible in server logs,
 *  browser history, and Referer headers. This implementation sends the token in
 *  the Authorization header instead.
 *
 * FIXES vs original:
 *  1. Token is sent via Authorization header, not in the URL.
 *  2. Reconnect actually works — retryCount state triggers a new connection.
 *  3. The non-existent `onconnected` event handler has been removed.
 */
export function useSSE(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // retryCount increments to re-trigger the effect and reconnect
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("No auth token found");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const connect = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed with status ${response.status}`);
        }

        setConnected(true);
        setError(null);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parse = createSSEParser(({ event, data: eventData }) => {
          try {
            const parsed = JSON.parse(eventData);
            if (event === "update") setData(parsed);
            else if (event === "error") console.error("Server SSE error event:", parsed);
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        });

        // Parse the SSE stream line-by-line
        while (true) {
          const { done, value } = await reader.read();
          if (done) throw new Error("SSE stream closed");
          parse(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        if (err.name === "AbortError") return; // intentional teardown — don't reconnect

        console.error("SSE connection error:", err);
        setConnected(false);
        setError("Connection error — retrying in 5s...");

        // Schedule a reconnect by bumping retryCount, which re-runs this effect
        retryTimerRef.current = setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 5000);
      }
    };

    connect();

    return () => {
      // Abort the in-flight fetch and cancel any pending reconnect timer
      controller.abort();
      clearTimeout(retryTimerRef.current);
      setConnected(false);
    };
  }, [url, retryCount]); // retryCount triggers reconnect on failure

  return { data, connected, error };
}
