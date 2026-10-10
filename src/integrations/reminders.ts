import { ReminderInput } from '../domain/reminders';
export const localReminders = {
  available: false,
  async setOwner(_owner: string | null): Promise<void> {},
  async status(
    _owner: string,
  ): Promise<{
    allowed: boolean;
    scheduled: { id: string; owner: string; day: number; time: string } | null;
  }> {
    return { allowed: false, scheduled: null };
  },
  async apply(_owner: string, _input: ReminderInput): Promise<string | null> {
    throw new Error('Telefon hatırlatmaları iOS ve Android uygulamasında kullanılabilir.');
  },
  observe(_open: () => void): () => void {
    return () => {};
  },
};
