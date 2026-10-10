import { useEffect } from 'react';
import { router } from 'expo-router';
import { localReminders } from '../integrations/reminders';
export function ReminderNavigation({ profileReady }: { profileReady: boolean }) {
  useEffect(() => {
    if (!profileReady) return;
    return localReminders.observe(() => router.push('/notifications'));
  }, [profileReady]);
  return null;
}
