import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as NativeAppState, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../state/AppProvider';
import { dateLabel } from '../domain/logic';
import { makeId } from '../domain/state';
import {
  DEMO_GUEST,
  DEMO_OWNER,
  roleLabel,
  shareWeek,
  sharedItemSchema,
  type BoardContent,
  type HouseholdHome,
  type InvitePreview,
  type MemberAction,
} from '../domain/household';
import {
  connectedHouseholdPort,
  demoHouseholdPort,
  householdEnabled,
  householdMessage,
  type HouseholdPort,
} from '../integrations/household';
import { Button, Chip, Field, IconButton, Notice, Page, WeekPicker } from '../ui/components';
import { SharePanel } from '../ui/SharePanel';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';
import {
  prepareHouseholdPublication,
  publicationBoard,
  publicationIsCurrent,
  publicationSourceIsCurrent,
  type HouseholdPublication,
} from '../domain/householdPublication';
import { HouseholdPublishPreview } from '../ui/HouseholdPublishPreview';

export function SharedHousehold() {
  const auth = useAuth();
  const { state, getState, dispatch, week } = useApp();
  const demo = !householdEnabled || !auth.user;
  const [demoActor, setDemoActor] = useState(DEMO_OWNER);
  const actor = demo ? demoActor : auth.user!.id;
  const port = useMemo(
    () =>
      demo
        ? demoHouseholdPort(
            actor,
            () => getState().householdDemo,
            (value) => dispatch({ type: 'householdDemo', value }),
          )
        : connectedHouseholdPort(actor),
    [demo, actor, getState, dispatch],
  );
  return (
    <Page maxWidth={720} gap={14}>
      <Text style={s.title}>Ortak soframız</Text>
      {demo && (
        <>
          <Notice text="Yerel hane denemesi · Gerçek davet gönderilmez; yalnızca bu cihazda çalışır." />
          {state.householdDemo && (
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              <Chip
                label="Hane sahibi"
                accessibilityLabel="Hane sahibi olarak dene"
                selected={actor === DEMO_OWNER}
                onPress={() => setDemoActor(DEMO_OWNER)}
              />
              <Chip
                label="Davetli"
                accessibilityLabel="Davetli olarak dene"
                selected={actor === DEMO_GUEST}
                onPress={() => setDemoActor(DEMO_GUEST)}
              />
            </View>
          )}
        </>
      )}
      <WeekPicker />
      <HouseholdWorkspace
        key={`${demo}-${actor}-${week}`}
        actor={actor}
        demo={demo}
        port={port}
        person={
          demo
            ? actor === DEMO_OWNER
              ? auth.user?.name || 'Ben'
              : 'Deneme üyesi'
            : auth.user!.name
        }
        initialCode={demo && actor === DEMO_GUEST ? (state.householdDemo?.invite?.code ?? '') : ''}
      />
      <Button label="Kişisel listeme dön" secondary onPress={() => router.push('/list')} />
    </Page>
  );
}

function HouseholdWorkspace({
  actor,
  demo,
  port,
  person,
  initialCode,
}: {
  actor: string;
  demo: boolean;
  port: HouseholdPort;
  person: string;
  initialCode: string;
}) {
  const { state, getState, week } = useApp();
  const [home, setHome] = useState<HouseholdHome | null>();
  const [pane, setPane] = useState<'list' | 'menu' | 'members'>('list');
  const [name, setName] = useState('Bizim ev');
  const [displayName, setDisplayName] = useState(person);
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [invite, setInvite] = useState<{
    code: string;
    expiresAt: string;
    role: 'editor' | 'viewer';
  } | null>(null);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [publish, setPublish] = useState<HouseholdPublication | null>(null);
  const sourceChanged = useMemo(() => {
    if (!publish) return false;
    try {
      return !publicationSourceIsCurrent(publish, shareWeek(state, week));
    } catch {
      return true;
    }
  }, [publish, state, week]);
  const [confirm, setConfirm] = useState<{
    action: MemberAction;
    target?: string;
    title: string;
  } | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<'adet' | 'g' | 'ml' | 'paket'>('adet');
  const running = useRef(false);
  const live = useRef(true);
  const readVersion = useRef(0);
  useEffect(() => {
    live.current = true;
    readVersion.current++;
    return () => {
      live.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const version = ++readVersion.current;
    try {
      const next = await port.load(week);
      if (!live.current || version !== readVersion.current) return;
      setHome(next);
      setLoadError(false);
    } catch {
      if (!live.current || version !== readVersion.current) return;
      // Revoked/stale shared data is not left visible after a failed authority check.
      setHome(undefined);
      setLoadError(true);
    }
  }, [port, week]);
  const homeId = home?.id;
  useFocusEffect(
    useCallback(() => {
      let focused = true;
      const update = () => {
        if (focused && !running.current && NativeAppState.currentState !== 'background')
          void refresh();
      };
      update();
      const timer = demo ? undefined : setInterval(update, 20000);
      const listener = NativeAppState.addEventListener('change', (status) => {
        if (status === 'active') update();
      });
      const unwatch = !demo && homeId ? port.watch?.(homeId, update) : undefined;
      return () => {
        focused = false;
        readVersion.current++;
        if (timer) clearInterval(timer);
        listener.remove();
        unwatch?.();
      };
    }, [demo, homeId, port, refresh]),
  );
  const run = async (work: () => Promise<unknown>, message: string, done?: () => void) => {
    if (running.current) return;
    running.current = true;
    readVersion.current++;
    setBusy(true);
    setNotice('');
    try {
      await work();
      if (!live.current) return;
      done?.();
      setNotice(message);
    } catch (error) {
      if (live.current) {
        setNotice(householdMessage(error));
        // A publication confirmation belongs to the revision it previewed.
        // After a conflict, require a fresh preview instead of retrying stale data.
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          String(error.message).includes('HOUSEHOLD_CONFLICT')
        )
          setPublish(null);
      }
    } finally {
      if (live.current) {
        await refresh();
        setBusy(false);
      }
      running.current = false;
    }
  };
  const mine = home?.members.find((m) => m.id === actor);
  const editable = mine?.role === 'owner' || mine?.role === 'editor';
  const write = (content: BoardContent, done?: () => void) => {
    if (!home) return;
    void run(
      () => port.write(home.id, { ...home.board, content }),
      'Ortak liste kaydedildi.',
      done,
    );
  };
  const preparePublication = (keepManual = true) => {
    if (!home) return;
    try {
      setPublish(prepareHouseholdPublication(home, shareWeek(getState(), week), keepManual));
      setNotice('');
    } catch (error) {
      setNotice(householdMessage(error));
    }
  };
  return (
    <>
      {!!notice && <Notice text={notice} />}
      {loadError && (
        <Text accessibilityRole="alert" style={s.error}>
          Hane bilgisi doğrulanamadı. Bağlantını kontrol et; yazdığın ürün adı bu ekranda korunuyor.
          Ortak listede çevrimdışı değişiklik gönderilmez.
        </Text>
      )}
      {!home && (
        <Button
          label={busy ? 'İşlem sürüyor…' : 'Ortak haneyi yenile'}
          secondary
          disabled={busy}
          onPress={() => void refresh()}
        />
      )}
      {home === undefined && !loadError && <Text style={s.muted}>Hane yükleniyor…</Text>}
      {home === null && (
        <>
          <View style={s.card}>
            <Text style={s.h2}>Birlikte başlayın</Text>
            <Field
              label="Hanede görünen adım"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={60}
              editable={!busy}
            />
            <Text style={s.muted}>
              Bir kişi tek haneye katılabilir. Üyeler görünen adını görür; e-posta ve kişisel tarif
              defterin paylaşılmaz.
            </Text>
            {(!demo || actor === DEMO_OWNER) && (
              <>
                <Field
                  label="Hane adı"
                  value={name}
                  onChangeText={setName}
                  maxLength={60}
                  editable={!busy}
                />
                <Button
                  label="Hanemi oluştur"
                  disabled={busy || name.trim().length < 2 || displayName.trim().length < 2}
                  onPress={() =>
                    void run(
                      () => port.create(name, displayName),
                      demo ? 'Deneme hanen oluşturuldu.' : 'Hanen oluşturuldu.',
                    )
                  }
                />
              </>
            )}
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Bir haneye katıl</Text>
            <Field
              label="Davet kodu"
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setPreview(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={120}
              editable={!busy}
            />
            <Button
              label="Daveti kontrol et"
              secondary
              disabled={busy || !code.trim()}
              onPress={() =>
                void run(async () => {
                  const result = await port.preview(code);
                  if (live.current) setPreview(result);
                }, 'Katılmadan önce hane ve yetkini kontrol et.')
              }
            />
            {preview && (
              <>
                <Text style={s.h3}>
                  {preview.name} · {roleLabel[preview.role]}
                </Text>
                <Text style={s.muted}>
                  Katılınca bu haneye açıkça paylaşılan menü ve listeye erişirsin. Kendi menün
                  otomatik paylaşılmaz.
                </Text>
                <Button
                  label="Daveti kabul et ve katıl"
                  disabled={busy || displayName.trim().length < 2}
                  onPress={() =>
                    void run(
                      () => port.join(code, displayName),
                      'Haneye katıldın.',
                      () => {
                        setPreview(null);
                        setCode('');
                      },
                    )
                  }
                />
              </>
            )}
          </View>
        </>
      )}
      {home && (
        <>
          <View style={[s.card, { backgroundColor: colors.yellow }]}>
            <View style={s.between}>
              <Text style={[s.h2, { flex: 1 }]}>{home.name}</Text>
              <IconButton
                label="Ortak haneyi yenile"
                icon="refresh-outline"
                disabled={busy}
                onPress={() => void refresh()}
              />
            </View>
            <Text style={s.text}>
              {home.members.length} kişi · {mine ? roleLabel[mine.role] : ''}
            </Text>
            {!demo && <Text style={s.muted}>Bu ekran açıkken ortak kayıtlar yenilenir.</Text>}
          </View>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            <Chip label="Ortak liste" selected={pane === 'list'} onPress={() => setPane('list')} />
            <Chip label="Ortak menü" selected={pane === 'menu'} onPress={() => setPane('menu')} />
            <Chip
              label="Ev halkı"
              selected={pane === 'members'}
              onPress={() => setPane('members')}
            />
          </View>
          {pane !== 'members' && (
            <>
              {editable && (
                <Button
                  label="Kendi haftamı haneye aktar"
                  secondary
                  disabled={busy}
                  onPress={() => preparePublication()}
                />
              )}
              {!editable && (
                <Notice text="Görüntüleyen üyesin. Menü ve listeyi okuyabilirsin; değişiklik yapabilmek için yöneticinin yetki vermesi gerekir." />
              )}
              {publish && editable && (
                <HouseholdPublishPreview
                  value={publish}
                  stale={sourceChanged || !publicationIsCurrent(publish, home)}
                  sourceChanged={sourceChanged}
                  busy={busy}
                  onKeepManual={(keep) => {
                    try {
                      setPublish(prepareHouseholdPublication(home, publish.source, keep));
                    } catch (error) {
                      setNotice(householdMessage(error));
                    }
                  }}
                  onRefresh={() => preparePublication(publish.keepManual)}
                  onConfirm={() => {
                    if (sourceChanged) return;
                    void run(
                      async () => {
                        if (!publicationSourceIsCurrent(publish, shareWeek(getState(), week)))
                          throw new Error('HOUSEHOLD_SOURCE_CHANGED');
                        await port.write(home.id, publicationBoard(publish, home));
                      },
                      'Seçtiğin hafta haneye aktarıldı.',
                      () => setPublish(null),
                    );
                  }}
                  onCancel={() => setPublish(null)}
                />
              )}
            </>
          )}
          {pane === 'list' && (
            <>
              <Text style={s.h2}>
                {home.board.content.items.filter((i) => i.checked).length} /{' '}
                {home.board.content.items.length} ürün alındı
              </Text>
              {!home.board.content.items.length && (
                <Text style={s.muted}>
                  Ortak listeniz boş. Haftanı aktarabilir veya aşağıdan ürün ekleyebilirsin.
                </Text>
              )}
              {!!home.board.content.items.length && (
                <View style={s.card}>
                  {home.board.content.items.map((item) => (
                    <View key={item.id} style={[s.row, { gap: 8 }]}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}`}
                        accessibilityState={{ checked: item.checked, disabled: busy || !editable }}
                        aria-checked={item.checked}
                        disabled={busy || !editable}
                        onPress={() =>
                          write({
                            ...home.board.content,
                            items: home.board.content.items.map((i) =>
                              i.id === item.id ? { ...i, checked: !item.checked } : i,
                            ),
                          })
                        }
                        style={[s.row, { flex: 1, minHeight: 54, gap: 10 }]}
                      >
                        <Ionicons
                          name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={colors.green}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              s.text,
                              { textDecorationLine: item.checked ? 'line-through' : 'none' },
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text style={s.muted}>
                            {item.quantity.toLocaleString('tr-TR')} {item.unit}
                          </Text>
                        </View>
                      </Pressable>
                      {editable && (
                        <IconButton
                          label={`${item.name} ortak listeden kaldır`}
                          icon="close"
                          disabled={busy}
                          onPress={() =>
                            write({
                              ...home.board.content,
                              items: home.board.content.items.filter((i) => i.id !== item.id),
                            })
                          }
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
              {editable && (
                <View style={s.card}>
                  <Text style={s.h2}>Listeye bir şey ekle</Text>
                  <Field
                    label="Ortak ürün adı"
                    value={itemName}
                    onChangeText={setItemName}
                    maxLength={100}
                    editable={!busy}
                  />
                  <Field
                    label="Ortak ürün miktarı"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    maxLength={12}
                    editable={!busy}
                  />
                  <View style={[s.row, { flexWrap: 'wrap' }]}>
                    {(['adet', 'paket', 'g', 'ml'] as const).map((u) => (
                      <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
                    ))}
                  </View>
                  <Button
                    label="Ortak listeye ekle"
                    disabled={busy || !itemName.trim()}
                    onPress={() => {
                      const result = sharedItemSchema.safeParse({
                        id: makeId('shared'),
                        name: itemName,
                        quantity: Number(quantity.replace(',', '.')),
                        unit,
                        checked: false,
                      });
                      if (!result.success) {
                        setNotice('Ürün adı ve sıfırdan büyük geçerli bir miktar gir.');
                        return;
                      }
                      write(
                        {
                          ...home.board.content,
                          items: [...home.board.content.items, result.data],
                        },
                        () => {
                          setItemName('');
                          setQuantity('1');
                        },
                      );
                    }}
                  />
                </View>
              )}
            </>
          )}
          {pane === 'menu' && (
            <View style={s.card}>
              <Text style={s.h2}>Bu hafta sofrada</Text>
              {!home.board.content.menu.length && (
                <Text style={s.muted}>Henüz menü paylaşılmadı.</Text>
              )}
              {home.board.content.menu
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
                .map((m) => (
                  <View key={m.date + m.slot} style={{ gap: 4 }}>
                    <Text style={s.eyebrow}>
                      {dateLabel(m.date, { weekday: 'long' })} ·{' '}
                      {m.slot === 'lunch' ? 'Öğle' : 'Akşam'}
                    </Text>
                    <Text style={s.h3}>{m.title}</Text>
                    <Text style={s.muted}>{m.servings} kişilik</Text>
                  </View>
                ))}
              <Text style={s.muted}>
                Bu, hane için paylaşılan haftanın menüsüdür. Kişisel tarif defterlerine erişim
                vermez.
              </Text>
            </View>
          )}
          {pane === 'members' && (
            <>
              {home.members.map((member) => (
                <View key={member.id} style={s.card}>
                  <Text style={s.h3}>
                    {member.name}
                    {member.id === actor ? ' · Sen' : ''}
                  </Text>
                  <Text style={s.muted}>{roleLabel[member.role]}</Text>
                  {mine?.role === 'owner' && member.id !== actor && (
                    <>
                      <Button
                        label={`${member.name}: ${member.role === 'viewer' ? 'düzenleme yetkisi ver' : 'yalnızca görüntülesin'}`}
                        secondary
                        disabled={busy}
                        onPress={() =>
                          setConfirm({
                            action: member.role === 'viewer' ? 'editor' : 'viewer',
                            target: member.id,
                            title: `${member.name} için yetkiyi değiştir?`,
                          })
                        }
                      />
                      <Button
                        label={`${member.name}: yöneticiliği devret`}
                        secondary
                        disabled={busy}
                        onPress={() =>
                          setConfirm({
                            action: 'transfer',
                            target: member.id,
                            title: `${member.name} yönetici olacak. Sen düzenleyen olarak kalacaksın.`,
                          })
                        }
                      />
                      <Button
                        label={`${member.name}: haneden çıkar`}
                        secondary
                        disabled={busy}
                        onPress={() =>
                          setConfirm({
                            action: 'remove',
                            target: member.id,
                            title: `${member.name} ortak kayıtlara erişimini kaybedecek.`,
                          })
                        }
                      />
                    </>
                  )}
                </View>
              ))}
              {mine?.role === 'owner' && (
                <View style={s.card}>
                  <Text style={s.h2}>Sofraya davet et</Text>
                  <Text style={s.muted}>
                    Kod tek kullanımlık ve 24 saat geçerlidir. Yeni kod eski daveti iptal eder. Kodu
                    verdiğin kişi haneye katılabilir; yalnızca davet etmek istediğin kişiyle paylaş.
                  </Text>
                  <View style={[s.row, { flexWrap: 'wrap' }]}>
                    <Chip
                      label="Düzenleyen daveti"
                      selected={inviteRole === 'editor'}
                      onPress={() => setInviteRole('editor')}
                    />
                    <Chip
                      label="Görüntüleyen daveti"
                      selected={inviteRole === 'viewer'}
                      onPress={() => setInviteRole('viewer')}
                    />
                  </View>
                  <Button
                    label="Davet kodu oluştur"
                    disabled={busy || home.members.length >= 12}
                    onPress={() =>
                      void run(async () => {
                        const result = await port.invite(home.id, inviteRole);
                        if (live.current) setInvite(result);
                      }, 'Davet hazır. Kodu paylaşmadan önce yetkisini kontrol et.')
                    }
                  />
                  {invite && (
                    <>
                      <Field label="Oluşturulan davet kodu" value={invite.code} editable={false} />
                      <Text style={s.h3}>Bu kodun yetkisi: {roleLabel[invite.role]}</Text>
                      <Text style={s.muted}>
                        Son kullanım: {new Date(invite.expiresAt).toLocaleString('tr-TR')}
                      </Text>
                      <SharePanel
                        title="Sofra hane daveti"
                        label="Davet metnini paylaş"
                        text={`${demo ? 'Yalnızca bu cihazda geçerli DENEME daveti' : 'Sofra hane daveti'}\n${home.name}\nKod: ${invite.code}\nOrtak soframız ekranında kodu kontrol edip katılabilirsin.`}
                      />
                    </>
                  )}
                  <Button
                    label="Geçerli daveti iptal et"
                    secondary
                    disabled={busy}
                    onPress={() =>
                      void run(
                        () => port.manage(home.id, 'revoke'),
                        'Davet iptal edildi.',
                        () => setInvite(null),
                      )
                    }
                  />
                </View>
              )}
              <Button
                label={mine?.role === 'owner' ? 'Haneyi kapat' : 'Haneden ayrıl'}
                secondary
                disabled={busy}
                onPress={() =>
                  setConfirm({
                    action: mine?.role === 'owner' ? 'close' : 'leave',
                    title:
                      mine?.role === 'owner'
                        ? 'Ortak menüler, listeler ve davetler herkes için silinecek. Kişisel kayıtlar korunur.'
                        : 'Ortak kayıtlara erişimini kaybedeceksin. Kişisel kayıtların korunur.',
                  })
                }
              />
              {mine?.role === 'owner' && (
                <Text style={s.muted}>
                  Haneyi kapatmadan ayrılmak için yöneticiliği bir üyeye devret. Yönetici hesabını
                  silmek haneyi de siler.
                </Text>
              )}
              {confirm && (
                <View style={s.card}>
                  <Text style={s.h3}>{confirm.title}</Text>
                  <Button
                    label="Hane işlemini onayla"
                    disabled={busy}
                    onPress={() =>
                      void run(
                        () => port.manage(home.id, confirm.action, confirm.target),
                        'Hane güncellendi.',
                        () => {
                          setConfirm(null);
                          setInvite(null);
                        },
                      )
                    }
                  />
                  <Button
                    label="Hane işleminden vazgeç"
                    secondary
                    disabled={busy}
                    onPress={() => setConfirm(null)}
                  />
                </View>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
