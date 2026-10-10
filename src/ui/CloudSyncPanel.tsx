import React, { useState } from 'react';
import { View } from 'react-native';
import { useCloudSync } from '../state/CloudSyncProvider';
import { stateSummary } from '../domain/backup';
import { authMessage } from '../auth/contracts';
import { Button, Notice } from './components';
import { Text } from './Text';
import { styles as s } from './theme';

export function CloudSyncPanel() {
  const sync = useCloudSync();
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<'local' | 'remote' | null>(null);
  const conflict = sync.conflict;
  return (
    <View style={s.card}>
      <Text style={s.h2}>Cihazlarım arasında</Text>
      {!sync.available ? (
        <Text style={s.muted}>
          Bulut eşitleme gerçek Supabase hesabıyla açılır. Demo ve misafir kayıtları bu cihazda
          kalır; yedek dışa aktarımı kullanabilirsin.
        </Text>
      ) : (
        <>
          <Text style={s.muted}>
            Eşitleme uygulama açıkken çalışır. İki cihazda farklı değişiklik varsa kopyanı seçersin.
            İnternet yokken menünü kullanmaya devam edebilirsin.
          </Text>
          <Button
            label={sync.settings.enabled ? 'Otomatik eşitlemeyi kapat' : 'Otomatik eşitlemeyi aç'}
            secondary
            disabled={sync.busy || !sync.loaded}
            onPress={() => {
              setError('');
              void sync.setEnabled(!sync.settings.enabled).catch((e) => setError(authMessage(e)));
            }}
          />
          <Button
            label={sync.busy ? 'Sofran kontrol ediliyor…' : 'Şimdi eşitle'}
            disabled={sync.busy || !sync.loaded}
            onPress={() => {
              setChoice(null);
              void sync.run();
            }}
          />
          {sync.settings.lastSync && (
            <Text style={s.muted}>
              Son başarılı kontrol: {new Date(sync.settings.lastSync).toLocaleString('tr-TR')}
            </Text>
          )}
          {conflict && (
            <View style={{ gap: 12 }}>
              <Notice text="Cihaz ve bulut arasında farklı kayıtlar var. Seçim yapmadan üzerine yazılmaz." />
              <Text style={s.h3}>Bu cihaz</Text>
              <Text style={s.text}>{stateSummary(conflict.local)}</Text>
              <Text style={s.h3}>Bulut</Text>
              <Text style={s.text}>
                {conflict.remote
                  ? stateSummary(conflict.remote.state)
                  : 'Bulut kopyası bulunamadı.'}
              </Text>
              {conflict.remote && (
                <Text style={s.muted}>
                  {new Date(conflict.remote.updatedAt).toLocaleString('tr-TR')}
                </Text>
              )}
              <Button
                label="Bu cihazdaki sofrayı seç"
                secondary
                disabled={sync.busy}
                onPress={() => setChoice('local')}
              />
              <Button
                label="Buluttaki sofrayı seç"
                secondary
                disabled={sync.busy || !conflict.remote}
                onPress={() => setChoice('remote')}
              />
              {choice && (
                <>
                  <Text style={s.muted}>
                    {choice === 'local'
                      ? 'Cihazdaki sofran bulut kopyasının yerini alacak.'
                      : 'Buluttaki sofran bu cihazdaki kopyanın yerini alacak.'}{' '}
                    Önceki kopya bu cihazda geri alma kopyası olarak korunur.
                  </Text>
                  <Button
                    label="Seçtiğim kopyayla devam et"
                    disabled={sync.busy}
                    onPress={() => {
                      void sync.run(choice);
                      setChoice(null);
                    }}
                  />
                  <Button label="Seçimden vazgeç" secondary onPress={() => setChoice(null)} />
                </>
              )}
            </View>
          )}
          {!sync.loaded && (
            <Button
              label="Eşitleme ayarını sıfırla"
              secondary
              onPress={() => {
                void sync.clear().catch((e) => setError(authMessage(e)));
              }}
            />
          )}
        </>
      )}
      {!!(error || sync.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error || sync.error}
        </Text>
      )}
      {!!sync.message && <Notice text={sync.message} />}
    </View>
  );
}
