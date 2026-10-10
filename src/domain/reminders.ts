export type ReminderInput = { enabled: boolean; day: number; time: string };
export type ScheduledReminder = { id: string; owner: string; day: number; time: string };
export interface ReminderPort {
  list(): Promise<ScheduledReminder[]>;
  permission(request: boolean): Promise<boolean>;
  schedule(owner: string, input: ReminderInput): Promise<string>;
  cancel(id: string): Promise<void>;
}
export function weeklyTime(input: ReminderInput) {
  if (
    !Number.isInteger(input.day) ||
    input.day < 0 ||
    input.day > 6 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
  )
    throw new Error('Geçerli bir gün ve saat gir. Örneğin 18:30.');
  const [hour, minute] = input.time.split(':').map(Number);
  return { weekday: ((input.day + 1) % 7) + 1, hour, minute };
}
export function createReminderController(port: ReminderPort) {
  let currentOwner: string | null = null;
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = pending.then(work, work);
    pending = result.catch(() => undefined);
    return result;
  }
  const assertOwner = (owner: string) => {
    if (currentOwner !== owner) throw new Error('Hesap değişti. Hatırlatmayı tekrar aç.');
  };
  return {
    setOwner(owner: string | null) {
      currentOwner = owner;
      return serial(async () => {
        for (const item of await port.list())
          if (item.owner !== currentOwner) await port.cancel(item.id);
      });
    },
    status(owner: string) {
      return serial(async () => {
        assertOwner(owner);
        const allowed = await port.permission(false);
        const items = await port.list();
        assertOwner(owner);
        return { allowed, scheduled: items.find((item) => item.owner === owner) ?? null };
      });
    },
    apply(owner: string, input: ReminderInput) {
      weeklyTime(input);
      return serial(async () => {
        assertOwner(owner);
        if (input.enabled && !(await port.permission(true)))
          throw new Error(
            'Bildirim izni verilmedi. Telefon ayarlarından Sofra bildirimlerini açabilirsin.',
          );
        assertOwner(owner);
        // Cancel only Sofra menu reminders, never unrelated notifications.
        for (const item of await port.list()) await port.cancel(item.id);
        assertOwner(owner);
        if (!input.enabled) return null;
        const id = await port.schedule(owner, input);
        if (currentOwner !== owner) {
          await port.cancel(id);
          assertOwner(owner);
        }
        return id;
      });
    },
  };
}
