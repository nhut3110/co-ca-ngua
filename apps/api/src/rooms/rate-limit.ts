/** Per-instance protection for unauthenticated room creation/join attempts.
 * A shared edge limiter is still required before running multiple API instances. */
export function roomRateLimiter() {
  const windows = new Map<string, { count: number; reset: number }>();
  return (
    req: { method: string; path: string; ip?: string },
    res: { status: (status: number) => { json: (value: unknown) => void } },
    next: () => void,
  ) => {
    if (
      req.method !== 'POST' ||
      !(req.path === '/rooms' || /^\/rooms\/[A-Z2-9]{6}\/join$/i.test(req.path))
    )
      return next();
    const now = Date.now();
    if (windows.size > 5000) {
      for (const [key, value] of windows) if (value.reset <= now) windows.delete(key);
      if (windows.size > 5000)
        return res.status(429).json({ message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' });
    }
    const key = req.ip ?? 'unknown';
    let window = windows.get(key);
    if (!window || window.reset <= now) {
      window = { count: 0, reset: now + 60_000 };
      windows.set(key, window);
    }
    if (++window.count > 30)
      return res.status(429).json({ message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' });
    next();
  };
}
