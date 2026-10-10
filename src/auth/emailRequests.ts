export const EMAIL_RETRY_MS = 60_000;

// In-memory UX guard shared by the account screens. The server enforces real quotas.
// No address, password or token is retained here.
export function createEmailRequestGate(now: () => number = Date.now) {
  let pending = false;
  let until = 0;
  return {
    async run<T>(request: () => Promise<T>, started: (until: number) => void): Promise<T> {
      if (pending || now() < until)
        throw new Error('Sofra:Yeni bağlantı istemeden önce biraz bekle.');
      pending = true;
      until = now() + EMAIL_RETRY_MS;
      try {
        started(until);
        return await request();
      } finally {
        pending = false;
      }
    },
  };
}

type LinkParams = Record<string, string | string[] | undefined>;
export function readAuthLink(params: LinkParams) {
  const relevant = [
    params.code,
    params.error,
    params.error_code,
    params.error_description,
    params['#'],
  ];
  const invalid = relevant.some((v) => Array.isArray(v) || (v !== undefined && v.length > 4096));
  if (invalid) return { code: '', failed: true };
  const hash = new URLSearchParams((params['#'] as string | undefined)?.replace(/^#/, ''));
  const failed = ['error', 'error_code', 'error_description'].some(
    (key) => params[key] !== undefined || hash.has(key),
  );
  const code = typeof params.code === 'string' ? params.code : '';
  return {
    code: failed || code.length > 2048 ? '' : code,
    failed: failed || code.length > 2048 || params.code === '',
  };
}
