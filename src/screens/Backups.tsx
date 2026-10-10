import React, { useCallback, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { useAuth } from '../auth/AuthProvider';
import { useCloudSync } from '../state/CloudSyncProvider';
import { authMessage } from '../auth/contracts';
import { AppState } from '../domain/model';
import { MAX_BACKUP_LENGTH, parseBackup, stateSummary } from '../domain/backup';
import { backupComparison, backupSizeLabel, createBackupFile } from '../domain/backupFile';
import { saveBackupFile, selectBackupFile } from '../integrations/backupFiles';
import { Button, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';

type Preview = { state: AppState; at: string; title: string; expected: AppState; size?: number };
export function Backups() {
  const { state, getState, replace, readRecovery } = useApp();
  const auth = useAuth();
  const sync = useCloudSync();
  const [text, setText] = useState('');
  const [textOptions, setTextOptions] = useState(false);
  const [exportText, setExportText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      setBusy('');
      return () => {
        active.current?.abort();
        active.current = null;
      };
    }, []),
  );

  const run = async (kind: string, task: (signal: AbortSignal) => Promise<void>) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(kind);
    setError('');
    setMessage('');
    try {
      await task(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error && e.message.startsWith('Sofra:')
            ? authMessage(e)
            : 'İşlem tamamlanamadı. Dosyaya erişimi ve cihazındaki boş alanı kontrol edip tekrar dene.',
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy('');
      }
    }
  };
  const exportFile = (value: AppState) =>
    void run('export', async (signal) => {
      const file = createBackupFile(value);
      await saveBackupFile(file, signal);
      if (!signal.aborted)
        setMessage(
          Platform.OS === 'web'
            ? 'İndirme başlatıldı · ' +
                backupSizeLabel(file.bytes) +
                '. Dosyanı tarayıcının indirilenler bölümünden kontrol edebilirsin.'
            : 'Paylaşım menüsü kapandı. Kaydetmeyi seçtiysen yedeğini seçtiğin konumdan kontrol edebilirsin.',
        );
    });
  const disabled = !!busy;
  const changed = !!preview && state !== preview.expected;
  return (
    <Page key={preview ? 'preview' : 'select'} maxWidth={650} gap={16}>
      <Text style={s.eyebrow}>SOFRANI YANINDA TAŞI</Text>
      <Text style={s.title}>Yedek ve geri yükleme</Text>
      <Text style={s.muted}>
        Tariflerini, menünü ve listelerini bir dosyaya kaydet. Yeni cihazında aynı dosyayla devam
        et.
      </Text>
      <Text style={s.h3}>
        {auth.user
          ? (auth.user.name || auth.user.email) +
            ' · ' +
            (auth.mode === 'demo' ? 'Demo hesabı' : 'Hesabın')
          : 'Misafir sofran · Bu cihaz'}
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!message && (
        <View accessibilityLiveRegion="polite">
          <Notice text={message} />
        </View>
      )}
      {!!busy && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {busy === 'pick'
            ? 'Yedek dosyanı seç…'
            : busy === 'restore'
              ? 'Sofran geri yükleniyor…'
              : 'Dosyan hazırlanıyor…'}
        </Text>
      )}
      {busy === 'pick' && Platform.OS === 'web' && (
        <Button label="Dosya seçimini iptal et" secondary onPress={() => active.current?.abort()} />
      )}
      {!!preview && (
        <View testID="backup-preview" style={s.card}>
          <Text style={s.eyebrow}>ÖNCE KONTROL ET</Text>
          <Text style={s.h2}>{preview.title}</Text>
          <Text style={s.muted}>
            {new Date(preview.at).toLocaleString('tr-TR')}
            {preview.size ? ' · ' + backupSizeLabel(preview.size) : ''}
          </Text>
          <View style={s.between}>
            <Text style={[s.muted, { flex: 1 }]}>İçerik</Text>
            <Text style={[s.muted, { width: 56, textAlign: 'center' }]}>Şimdi</Text>
            <Text style={[s.muted, { width: 56, textAlign: 'center' }]}>Yedek</Text>
          </View>
          {backupComparison(state, preview.state).map((row) => (
            <View
              key={row.label}
              accessible
              accessibilityLabel={row.label + ': şimdi ' + row.current + ', yedek ' + row.incoming}
              style={s.between}
            >
              <Text style={[s.text, { flex: 1 }]}>{row.label}</Text>
              <Text style={[s.text, { width: 56, textAlign: 'center' }]}>{row.current}</Text>
              <Text style={[s.h3, { width: 56, textAlign: 'center' }]}>{row.incoming}</Text>
            </View>
          ))}
          <Text style={s.muted}>
            {preview.state.profile
              ? preview.state.profile.people + ' kişilik sofra'
              : 'Sofra tercihleri henüz belirlenmemiş'}{' '}
            · Kayıtlar birleştirilmez, bu kopyayla değiştirilir.
          </Text>
          <Notice text="Onayladığında yalnızca bu sofranın kayıtları değişir. Mevcut sofranın bir geri alma kopyası cihazda saklanır; sonraki geri yüklemede onun yerini yeni kopya alır." />
          {sync.available && sync.settings.enabled && (
            <Notice text="Bulut eşitlemen açık. Geri yüklediğin sofra buluta da eşitlenir. Yalnızca bu cihazda tutmak için önce Hesabım bölümünden eşitlemeyi kapat." />
          )}
          {changed && (
            <>
              <Text accessibilityRole="alert" style={s.error}>
                Önizlemeden sonra sofran değişti. Güncel kayıtlarla tekrar incele.
              </Text>
              <Button
                label="Güncel sofrayla yeniden incele"
                secondary
                disabled={disabled}
                onPress={() => setPreview({ ...preview, expected: getState() })}
              />
            </>
          )}
          <Button
            label="Bu yedeği geri yükle"
            disabled={disabled || changed || sync.busy}
            onPress={() =>
              void run('restore', async (signal) => {
                await replace(preview.state, { expected: preview.expected });
                if (signal.aborted) return;
                setPreview(null);
                setText('');
                setExportText('');
                setMessage(
                  'Yedek geri yüklendi. Önceki sofrana son geri alma kopyasından dönebilirsin.',
                );
              })
            }
          />
          <Button
            label="Bu kopyayı dosya olarak kaydet"
            secondary
            disabled={disabled}
            onPress={() => exportFile(preview.state)}
          />
          <Button label="Vazgeç" secondary disabled={disabled} onPress={() => setPreview(null)} />
        </View>
      )}
      {!preview && (
        <>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="download-outline" size={26} color={colors.green} />
              <Text style={s.h2}>Sofranı kaydet</Text>
            </View>
            <Text style={s.muted}>{stateSummary(state)}</Text>
            <Button
              label="Yedek dosyasını kaydet"
              icon="download-outline"
              disabled={disabled}
              onPress={() => exportFile(getState())}
            />
            <Text style={[s.muted, { fontSize: 12 }]}>
              Dosya kişisel tarif ve fotoğraflarını içerir, şifresizdir. Şifre veya oturum bilgisi
              içermez.
            </Text>
          </View>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="folder-open-outline" size={26} color={colors.green} />
              <Text style={[s.h2, { flex: 1 }]}>Yedeğinden devam et</Text>
            </View>
            <Text style={s.muted}>
              Sofra yedeğini seç. İçeriğini görüp onaylayana kadar kayıtların değişmez.
            </Text>
            <Button
              label="Yedek dosyası seç"
              secondary
              icon="folder-open-outline"
              disabled={disabled}
              onPress={() =>
                void run('pick', async (signal) => {
                  const value = await selectBackupFile(signal);
                  if (!value || signal.aborted) return;
                  setPreview({
                    state: value.state,
                    at: value.exportedAt,
                    title: value.name,
                    size: value.bytes,
                    expected: getState(),
                  });
                  setText('');
                })
              }
            />
            <Text style={[s.muted, { fontSize: 12 }]}>
              .json veya .txt · En fazla 15 MB / 5 milyon karakter
            </Text>
          </View>
          <Button
            label="Son geri alma kopyasını incele"
            secondary
            icon="arrow-undo-outline"
            disabled={disabled}
            onPress={() =>
              void run('recovery', async (signal) => {
                const copy = await readRecovery();
                if (signal.aborted) return;
                if (!copy) {
                  setMessage('Bu hesap için henüz geri alma kopyası yok.');
                  return;
                }
                setPreview({
                  state: copy.state,
                  at: copy.createdAt,
                  title: copy.reason,
                  expected: getState(),
                });
              })
            }
          />
          <Button
            label={textOptions ? 'Metin seçeneklerini kapat' : 'Metinle aktarım seçenekleri'}
            secondary
            disabled={disabled}
            onPress={() => {
              setTextOptions(!textOptions);
              setExportText('');
            }}
          />
          {textOptions && (
            <View style={s.card}>
              <Text style={s.h3}>Metinden geri yükle</Text>
              <Text style={s.muted}>Eski yedek metninin tamamını yapıştırıp inceleyebilirsin.</Text>
              <Field
                label="Sofra yedek metni"
                value={text}
                multiline
                editable={!disabled}
                maxLength={MAX_BACKUP_LENGTH}
                style={[s.input, { minHeight: 110, maxHeight: 180 }]}
                onChangeText={(value) => {
                  setText(value);
                  setError('');
                  setMessage('');
                }}
              />
              <Button
                label="Yedeği incele"
                disabled={disabled || !text.trim()}
                onPress={() => {
                  try {
                    const value = parseBackup(text);
                    setPreview({
                      state: value.state,
                      at: value.exportedAt,
                      title: 'Seçtiğin yedek',
                      expected: getState(),
                    });
                    setError('');
                    setMessage('');
                  } catch (e) {
                    setError(authMessage(e));
                  }
                }}
              />
              <Button
                label="Yedek metnini göster"
                secondary
                disabled={disabled}
                onPress={() => {
                  try {
                    setExportText(createBackupFile(getState()).text);
                    setError('');
                  } catch (e) {
                    setError(authMessage(e));
                  }
                }}
              />
              {!!exportText && (
                <Field
                  label="Kopyalanacak yedek"
                  value={exportText}
                  editable={false}
                  multiline
                  selectTextOnFocus
                  style={[s.input, { maxHeight: 180 }]}
                />
              )}
            </View>
          )}
        </>
      )}
      <Text style={[s.muted, { fontSize: 12 }]}>
        Kişisel tarifler, fotoğraflar, tercihler, stok ve geçmiş dahildir. Canlı ortak hane,
        arkadaşlar ve topluluk gönderileri sunucuda kalır; bu dosyayla taşınmaz.
      </Text>
      <Button
        label={state.profile ? 'Soframa dön' : 'Soframı oluşturmaya dön'}
        secondary
        disabled={disabled}
        onPress={() => router.replace(state.profile ? '/' : '/onboarding')}
      />
    </Page>
  );
}
