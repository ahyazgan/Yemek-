export function ensureNotAborted(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Sofra:Bağlantı işlemi durduruldu.');
}

// Releases the UI even if an SDK operation ignores cancellation.
// Check the signal after non-abortable awaits, before starting a write.
export async function withDeadline<T>(
  task: (signal: AbortSignal) => PromiseLike<T>,
  message: string,
  externalSignal?: AbortSignal,
  timeoutMs = 12000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new Error('Sofra:Bağlantı işlemi durduruldu.'));
    };
    if (externalSignal?.aborted) cancel();
    else externalSignal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      interrupted,
      Promise.resolve().then(() => {
        ensureNotAborted(controller.signal);
        return task(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', cancel);
  }
}
