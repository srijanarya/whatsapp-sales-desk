"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

// Whether the server has an API key, from /api/health. Fetched once per page load.
export function useLiveAi() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/health")
      .then((r) => r.json())
      .then((h) => Boolean(h.liveAi))
      .catch(() => false);
    cached.then(setOn);
  }, []);
  return on;
}
