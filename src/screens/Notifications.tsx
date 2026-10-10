import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { useAuth } from '../auth/AuthProvider';
import { accountStorageKey } from '../auth/contracts';
import { localReminders } from '../integrations/reminders';
import { weeklyTime } from '../domain/reminders';
import { Text } from '../ui/Text';
import { Button, Chip, Field, Notice, Page } from '../ui/components';
import { styles as s } from '../ui/theme';
const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export function Notifications() {
  const { state, dispatch } = useApp();
  const auth = useAuth();
  const owner = accountStorageKey(auth.mode, auth.user);
  const [draft, setDraft] = useState(state.experience.reminder);
  const [status, setStatus] = useState(
    localReminders.available
      ? 'Cihazdaki plan kontrol ediliyor…'
      : 'Tarayıcıda bildirim planlanmaz. Tercihini kaydedip telefon uygulamasında açabilirsin.',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    if (!localReminders.available) {
      return Promise.resolve();
    }
    return localReminders
      .status(owner)
      .then((result) => {
        setStatus(
          !result.allowed
            ? 'Bu cihazda bildirim izni kapalı.'
            : result.scheduled
              ? `Bu cihazda planlı: ${days[result.scheduled.day]} · ${result.scheduled.time}`
              : 'Bu cihazda planlanmış hatırlatma yok.',
        );
      })
      .catch(() => setStatus('Cihazdaki hatırlatma okunamadı. Tekrar kontrol et.'));
  }, [owner]);
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (value) => {
      if (value === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      weeklyTime(draft);
      if (localReminders.available) await localReminders.apply(owner, draft);
      dispatch({ type: 'experience', value: { reminder: draft } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hatırlatma kaydedilemedi. Tekrar dene.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page maxWidth={650}>
      <Text style={s.eyebrow}>HAFTANA KÜÇÜK BİR DAVET</Text>
      <Text style={s.title}>Hatırlatmalarım</Text>
      <Notice text={status} />
      <View style={s.card}>
        <Text style={s.h2}>Haftalık menü</Text>
        <Text style={s.text}>
          Telefonunun yerel saatini kullanır. İnternet veya market bağlantısı gerekmez.
        </Text>
        <Chip
          label={draft.enabled ? 'Hatırlatma isteği açık' : 'Hatırlatma isteği kapalı'}
          selected={draft.enabled}
          onPress={() => setDraft({ ...draft, enabled: !draft.enabled })}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {days.map((day, i) => (
            <Chip
              key={day}
              label={day}
              selected={draft.day === i}
              onPress={() => setDraft({ ...draft, day: i })}
            />
          ))}
        </View>
        <Field
          label="Saat (SS:DD)"
          value={draft.time}
          maxLength={5}
          onChangeText={(time) => setDraft({ ...draft, time })}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          label={
            busy
              ? 'Kaydediliyor…'
              : localReminders.available
                ? 'Bu telefonda uygula'
                : 'Hatırlatma tercihini kaydet'
          }
          disabled={busy}
          onPress={() => void save()}
        />
        <Button
          label="Cihaz durumunu yenile"
          secondary
          disabled={busy}
          onPress={() => void refresh()}
        />
      </View>
      <Text style={s.muted}>
        Hesap değişince önceki hesabın hatırlatması kaldırılır. Yedek veya buluttan gelen tercih bu
        telefonda kendiliğinden açılmaz; burada uygula. Pil tasarrufu ve sessiz mod bildirimin
        zamanını veya görünümünü etkileyebilir.
      </Text>
    </Page>
  );
}
