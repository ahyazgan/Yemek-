import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { authMessage } from '../auth/contracts';
import { useApp } from '../state/AppProvider';
import { useCloudSync } from '../state/CloudSyncProvider';
import { Text } from '../ui/Text';
import { Button, Field, Notice, Page } from '../ui/components';
import { CloudSyncPanel } from '../ui/CloudSyncPanel';
import { styles as s } from '../ui/theme';

export function AccountScreen() {
  const auth = useAuth();
  const sync = useCloudSync();
  const { state, clearAccountData, clearRecovery } = useApp();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [serverDeleted, setServerDeleted] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const run = async (task: () => Promise<void>) => {
    if (running.current || sync.busy) return;
    running.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await task();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const disabled = busy || sync.busy;
  return (
    <Page maxWidth={650}>
      <Text style={s.eyebrow}>SANA AİT BİR SOFRA</Text>
      <Text style={s.title}>Hesabım</Text>
      {!!auth.error && <Notice text={auth.error} />}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!message && <Notice text={message} />}
      {!auth.user ? (
        <View style={s.card}>
          <Text style={s.h2}>Misafir olarak kullanıyorsun</Text>
          <Text style={s.muted}>
            Misafir menün bu cihazda kalır. Hesaba geçtiğinde ayrı bir sofra açılır; misafir
            kayıtların otomatik aktarılmaz. Yedek dışa aktarıp hesabında geri yükleyebilirsin.
          </Text>
          <Button label="Giriş yap" onPress={() => router.push('/sign-in')} />
          <Button label="Hesap oluştur" secondary onPress={() => router.push('/sign-up')} />
        </View>
      ) : (
        <>
          <Notice
            text={
              auth.mode === 'demo'
                ? 'Demo hesabı · Yalnızca bu cihazda. Gerçek kimlik doğrulama ve bulut eşitleme kapalı.'
                : 'Supabase hesabı · Kayıtların önce bu cihazda saklanır. Bulut eşitlemeyi aşağıdan açabilirsin.'
            }
          />
          {!serverDeleted && (
            <>
              <View style={s.card}>
                <Text style={s.h2}>{auth.user.email}</Text>
                <Field label="Görünen ad" value={name} onChangeText={setName} maxLength={60} />
                <Button
                  label="Profilimi kaydet"
                  disabled={disabled}
                  onPress={() =>
                    void run(async () => {
                      await auth.updateName(name);
                      setMessage('Profilin güncellendi.');
                    })
                  }
                />
                <Button
                  label="Şifremi değiştir"
                  secondary
                  disabled={disabled}
                  onPress={() => router.push('/reset-password')}
                />
                <Button
                  label="Çıkış yap"
                  secondary
                  disabled={disabled}
                  onPress={() =>
                    void run(async () => {
                      await auth.signOut();
                      router.replace('/account');
                    })
                  }
                />
              </View>
              <CloudSyncPanel />
              <Button
                label="Hesabımı sil"
                secondary
                disabled={disabled}
                onPress={() => {
                  setConfirm(true);
                  setConfirmation('');
                }}
              />
            </>
          )}
        </>
      )}
      {confirm && (
        <View style={s.card}>
          <Text style={s.h2}>
            {serverDeleted
              ? 'Cihazdaki temizliği tamamla'
              : 'Hesabını silmek istediğine emin misin?'}
          </Text>
          <Text style={s.muted}>
            {serverDeleted
              ? 'Sunucudaki silme adımı tamamlandı. Cihazdaki kayıt ve oturum temizliğini tekrar deneyebilirsin.'
              : 'Bu hesabın verileri kalıcı olarak silinir. Yöneticisi olduğun hane ve ortak kayıtları da herkes için silinir; haneyi korumak için önce yöneticiliği devret. Misafir kayıtların korunur. Onaylamak için SİL yaz.'}
          </Text>
          {!serverDeleted && (
            <Field label="Silme onayı" value={confirmation} onChangeText={setConfirmation} />
          )}
          <Button
            label="Hesabı ve verilerini kalıcı sil"
            disabled={disabled || (!serverDeleted && confirmation !== 'SİL')}
            onPress={() =>
              void run(async () => {
                if (!serverDeleted) {
                  await sync.setEnabled(false);
                  await auth.deleteAccount();
                  setServerDeleted(true);
                }
                await clearAccountData();
                await clearRecovery();
                await sync.clear();
                await auth.signOut();
                router.replace('/account');
              })
            }
          />
          {!serverDeleted && (
            <Button
              label="Vazgeç"
              secondary
              disabled={disabled}
              onPress={() => setConfirm(false)}
            />
          )}
        </View>
      )}
      {!serverDeleted && (
        <>
          <Button label="Yedek ve geri yükleme" secondary onPress={() => router.push('/backups')} />
          <Button
            label={state.profile ? 'Mutfağıma dön' : 'Soframı hazırla'}
            secondary
            onPress={() => router.replace(state.profile ? '/kitchen' : '/onboarding')}
          />
          <Button label="Yardım ve sık sorulanlar" secondary onPress={() => router.push('/help')} />
          <Button
            label="Gizlilik ve kullanım bilgisi"
            secondary
            onPress={() => router.push('/privacy')}
          />
          <Button
            label="Bağlantılar ve servisler"
            secondary
            onPress={() => router.push('/services')}
          />
        </>
      )}
    </Page>
  );
}
