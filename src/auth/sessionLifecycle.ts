type SessionPort<T> = {
  subscribe: (listener: (event: string, session: T | null) => void) => () => void;
  read: () => Promise<{ session: T | null; error: unknown }>;
};

// Stored sessions bootstrap the UI; server operations still verify the user.
export function observeSession<T>(
  port: SessionPort<T>,
  callbacks: {
    session: (event: string, value: T | null) => void;
    ready: () => void;
    error: () => void;
  },
  timeoutMs = 12000,
) {
  let alive = true;
  let receivedEvent = false;
  let settled = false;
  let unsubscribe = () => {};
  const finish = () => {
    clearTimeout(timer);
    if (!settled) {
      settled = true;
      callbacks.ready();
    }
  };
  const timer = setTimeout(() => {
    if (alive && !settled) {
      callbacks.error();
      finish();
    }
  }, timeoutMs);
  try {
    unsubscribe = port.subscribe((event, session) => {
      if (!alive) return;
      receivedEvent = true;
      callbacks.session(event, session);
      finish();
    });
    void Promise.resolve()
      .then(() => (alive ? port.read() : null))
      .then((result) => {
        if (!alive || receivedEvent || settled || !result) return;
        if (result.error) callbacks.error();
        else callbacks.session('BOOTSTRAP', result.session);
      })
      .catch(() => {
        if (alive && !receivedEvent && !settled) callbacks.error();
      })
      .finally(() => {
        if (alive) finish();
      });
  } catch {
    callbacks.error();
    finish();
  }
  return () => {
    alive = false;
    clearTimeout(timer);
    unsubscribe();
  };
}

type RefreshPort = { start: () => Promise<void>; stop: () => Promise<void> };
type VisibilityPort = {
  currentState: string | null;
  subscribe: (listener: (state: string) => void) => () => void;
};
export function observeNativeRefresh(
  platform: string,
  visibility: VisibilityPort,
  refresh: RefreshPort,
  onError: () => void,
) {
  // Supabase manages browser visibility; starting manually replaces its handler.
  if (platform === 'web') return () => {};
  let alive = true;
  const update = (state: string | null) => {
    void (alive && state === 'active' ? refresh.start() : refresh.stop()).catch(() => {
      if (alive) onError();
    });
  };
  update(visibility.currentState);
  const unsubscribe = visibility.subscribe(update);
  return () => {
    alive = false;
    unsubscribe();
    update(null);
  };
}
