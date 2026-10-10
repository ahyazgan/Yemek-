import { AppState } from './model';
import { sameState } from './backup';

export type CloudCopy = { state: AppState; revision: number; updatedAt: string };
export type SyncAnchor = CloudCopy | null;
export type SyncConflict = { local: AppState; remote: CloudCopy | null };
export type SyncResult =
  | { kind: 'conflict'; conflict: SyncConflict }
  | { kind: 'synced' | 'uploaded' | 'downloaded'; anchor: CloudCopy };
export class SnapshotConflictError extends Error {
  constructor() {
    super('Sofra:Başka bir cihaz bu sırada bulut kopyasını değiştirdi. Yeniden kontrol et.');
  }
}
type Ports = {
  current: () => AppState;
  read: () => Promise<CloudCopy | null>;
  write: (state: AppState, expectedRevision: number) => Promise<CloudCopy>;
  replace: (state: AppState, expected: AppState) => Promise<void>;
  preserve: (state: AppState, reason: string) => Promise<void>;
};
export async function synchronize(
  ports: Ports,
  anchor: SyncAnchor,
  choice?: { side: 'local' | 'remote'; conflict: SyncConflict },
): Promise<SyncResult> {
  const remote = await ports.read();
  const local = ports.current();
  const conflict = (): SyncResult => ({ kind: 'conflict', conflict: { local, remote } });
  if (remote && sameState(local, remote.state)) return { kind: 'synced', anchor: remote };
  if (choice) {
    const previous = choice.conflict.remote;
    if (
      !sameState(local, choice.conflict.local) ||
      remote?.revision !== previous?.revision ||
      (!!remote && !!previous && !sameState(remote.state, previous.state))
    )
      return conflict();
  }
  const action =
    choice?.side === 'remote'
      ? 'pull'
      : choice?.side === 'local'
        ? 'push'
        : !remote
          ? anchor
            ? 'conflict'
            : 'push'
          : anchor && sameState(local, anchor.state)
            ? 'pull'
            : anchor && sameState(remote.state, anchor.state)
              ? 'push'
              : 'conflict';
  if (action === 'pull') {
    if (!remote) return conflict();
    await ports.replace(remote.state, local);
    return { kind: 'downloaded', anchor: remote };
  }
  if (action === 'push') {
    if (choice && remote) await ports.preserve(remote.state, 'Bulut çakışmasında önceki kopya');
    // A local edit during preservation requires the user to review the updated choice.
    if (choice && !sameState(ports.current(), local))
      return { kind: 'conflict', conflict: { local: ports.current(), remote } };
    try {
      return { kind: 'uploaded', anchor: await ports.write(local, remote?.revision ?? 0) };
    } catch (error) {
      if (!(error instanceof SnapshotConflictError)) throw error;
      return { kind: 'conflict', conflict: { local: ports.current(), remote: await ports.read() } };
    }
  }
  return conflict();
}
