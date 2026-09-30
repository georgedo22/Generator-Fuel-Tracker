"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetches JSON from an API route and keeps loading/error state.
 * State updates happen inside promise callbacks, never synchronously
 * during render or in the effect body.
 */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let active = true;

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Request failed");
        return json as T;
      })
      .then((json) => {
        if (active) setState({ data: json, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (active)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : "Request failed",
          });
      });

    return () => {
      active = false;
    };
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (data: T) => setState((s) => ({ ...s, data })),
    []
  );

  return { ...state, reload, setData };
}

/**
 * Multi-endpoint variant for pages that need several resources at once.
 * `load` must resolve a value; state is updated only after it resolves.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (active)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : "Request failed",
          });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}