import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { accountStorageKey } from '../auth/contracts';
import { localReminders } from '../integrations/reminders';
import { Notice } from './components';
export function ReminderBridge() {
  const auth = useAuth();
  const owner = accountStorageKey(auth.mode, auth.user);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth.ready) return;
    const reconcile = () =>
      void localReminders
        .setOwner(owner)
        .then(() => setError(''))
        .catch(() =>
          setError('Eski hatırlatma temizlenemedi. Hatırlatmalarım ekranından tekrar kontrol et.'),
        );
    reconcile();
    const appState = AppState.addEventListener('change', (value) => {
      if (value === 'active') reconcile();
    });
    return () => {
      appState.remove();
    };
  }, [auth.ready, owner]);
  return error ? <Notice text={error} /> : null;
}
