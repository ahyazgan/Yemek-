export async function boundedText(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  timeoutMs = 5000,
) {
  if (!body) throw new Error('Request body required');
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0,
    text = '',
    timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
  });
  try {
    for (;;) {
      const next = await Promise.race([reader.read(), timeout]);
      if (next.done) return text + decoder.decode();
      size += next.value.byteLength;
      if (size > limit) throw new Error('Request too large');
      text += decoder.decode(next.value, { stream: true });
    }
  } finally {
    clearTimeout(timer);
    // Cancellation from an untrusted stream must not hold the response open.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// Call ONLY after Auth has verified this exact token. Parsing is not verification.
export function verifiedSessionId(token: string): string | null {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.session_id === 'string' &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payload.session_id)
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}
