import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { checkAccountConnection, type ConnectionCheck } from '../integrations/connectionCheck';
import { Button, Notice } from './components';
import { Text } from './Text';
import { styles as s } from './theme';

export function ConnectionStatus() {
  const [checks, setChecks] = useState<ConnectionCheck[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      setBusy(false);
      setChecks([]);
      setError('');
      return () => {
        request.current?.abort();
        request.current = null;
      };
    }, []),
  );
  const check = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setChecks([]);
    setError('');
    try {
      const result = await checkAccountConnection(controller.signal);
      if (!controller.signal.aborted) setChecks(result);
    } catch {
      if (!controller.signal.aborted) setError('Kontrol tamamlanamadı. Yeniden deneyebilirsin.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <View style={s.card}>
      <Text style={s.h2}>Hesap bağlantısını kontrol et</Text>
      <Text style={s.text}>
        Hesabının ve bulut yedeğinin bağlantı durumunu burada görebilirsin. Kontrol sırasında
        tariflerin veya listelerin gönderilmez.
      </Text>
      <Button
        label={busy ? 'Kontrol ediliyor…' : 'Bağlantıyı kontrol et'}
        disabled={busy}
        onPress={() => void check()}
        icon="refresh-outline"
      />
      {busy && (
        <Button
          secondary
          label="Kontrolü durdur"
          onPress={() => {
            request.current?.abort();
            request.current = null;
            setBusy(false);
          }}
        />
      )}
      {!!error && <Notice text={error} />}
      <View accessibilityLiveRegion="polite" style={{ gap: 16 }}>
        {checks.map((check) => (
          <View key={check.id} style={{ gap: 4 }}>
            <Text style={s.h3}>
              {check.title} ·{' '}
              {check.status === 'ok'
                ? 'Kontrol edildi'
                : check.status === 'error'
                  ? 'Kontrol gerekli'
                  : 'Bekliyor'}
            </Text>
            <Text style={s.text}>{check.detail}</Text>
          </View>
        ))}
      </View>
      {!!checks.length && (
        <Text style={s.muted}>
          Bu sonuç anlık bağlantı durumudur. E-posta teslimi, cihazlar arası eşitleme, hane
          paylaşımı ve hesap silme ayrıca denenmelidir.
        </Text>
      )}
      {checks.some((check) => check.id === 'backup' && check.status === 'waiting') && (
        <Button secondary label="Dosyayla yedekle" onPress={() => router.push('/backups')} />
      )}
    </View>
  );
}
