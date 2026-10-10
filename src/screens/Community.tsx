import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import {
  communityAction,
  communityEnabled,
  communityHome,
  CommunityPost,
  findCommunityProfile,
  publishRecipe,
  removeCommunityPost,
  reportCommunityProfile,
  saveCommunityProfile,
} from '../integrations/community';
import { Button, Chip, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { SharePanel } from '../ui/SharePanel';
import { styles as s } from '../ui/theme';
type Home = Awaited<ReturnType<typeof communityHome>>;
export function Community() {
  const auth = useAuth();
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>PAYLAŞTIKÇA GÜZEL</Text>
      <Text style={s.title}>Arkadaş sofraları</Text>
      {!communityEnabled || !auth.user ? (
        <>
          <Notice text="Gerçek arkadaşlık için hesap ve topluluk bağlantısının kurulması gerekiyor. Demo kişiler veya sahte paylaşımlar gösterilmiyor." />
          <View style={s.card}>
            <Text style={s.h2}>Sen karar verirsin</Text>
            <Text style={s.text}>
              Profilin başlangıçta özeldir. Kullanıcı adını bilenler arkadaşlık isteği gönderebilir;
              onayladıkların açıkça paylaştığın tarifleri görür. Menü, alışveriş ve kişisel notların
              bu alanda paylaşılmaz.
            </Text>
          </View>
          <Button label="Hesabıma git" onPress={() => router.push('/account')} />
        </>
      ) : (
        <ConnectedCommunity key={auth.user.id} />
      )}
    </Page>
  );
}
function ConnectedCommunity() {
  const { state } = useApp();
  const auth = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState(auth.user?.name ?? '');
  const [bio, setBio] = useState('');
  const [isPublic, setPublic] = useState(false);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Awaited<ReturnType<typeof findCommunityProfile>>>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const refresh = async () => {
    const next = await communityHome();
    setHome(next);
    if (next.profile) {
      setHandle(next.profile.handle);
      setName(next.profile.display_name);
      setBio(next.profile.bio);
      setPublic(next.profile.is_public);
    }
  };
  useEffect(() => {
    let live = true;
    communityHome()
      .then((next) => {
        if (!live) return;
        setHome(next);
        if (next.profile) {
          setHandle(next.profile.handle);
          setName(next.profile.display_name);
          setBio(next.profile.bio);
          setPublic(next.profile.is_public);
        }
      })
      .catch(() => {
        if (live)
          setNotice('Topluluk yüklenemedi. Bağlantıyı veya kurulumu kontrol edip tekrar dene.');
      });
    return () => {
      live = false;
    };
  }, []);
  const run = async (work: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await work();
      await refresh();
      setNotice(message);
    } catch {
      setNotice('İşlem tamamlanamadı. Kullanıcı adı, oturum veya bağlantıyı kontrol et.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!!notice && <Notice text={notice} />}
      <Button
        label="Paylaşımları yenile"
        secondary
        disabled={busy}
        onPress={() => void run(refresh, 'Güncellendi.')}
      />
      {!home?.profile || profileOpen ? (
        <View style={s.card}>
          <Text style={s.h2}>Paylaşım profilim</Text>
          <Field
            label="Kullanıcı adım"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            maxLength={30}
          />
          <Text style={s.muted}>
            3–30 karakter; küçük Latin harfi, rakam ve alt çizgi. Bir harfle başlasın.
          </Text>
          <Field label="Görünen adım" value={name} onChangeText={setName} maxLength={60} />
          <Field label="Kısa tanıtımım" value={bio} onChangeText={setBio} maxLength={300} />
          <Chip
            label="Profilimi tüm Sofra üyeleri görebilsin"
            selected={isPublic}
            onPress={() => setPublic(!isPublic)}
          />
          <Text style={s.muted}>
            {isPublic
              ? 'Yayımladığın tarifler tüm giriş yapmış üyelere açılır.'
              : 'Yayımladığın tarifleri yalnızca onaylanmış arkadaşların görür.'}{' '}
            E-posta ve alışveriş verileri paylaşılmaz.
          </Text>
          <Button
            label="Paylaşım profilini kaydet"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await saveCommunityProfile({
                  handle: handle.trim().toLowerCase(),
                  display_name: name.trim(),
                  bio,
                  is_public: isPublic,
                });
                setProfileOpen(false);
              }, 'Profilin kaydedildi.')
            }
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.h2}>@{home.profile.handle}</Text>
          <Text style={s.muted}>
            {home.profile.is_public ? 'Üyelere açık profil' : 'Özel profil'}
          </Text>
          <Button
            label="Profil gizliliğini düzenle"
            secondary
            onPress={() => setProfileOpen(true)}
          />
        </View>
      )}
      {!!home?.profile && (
        <>
          <View style={s.card}>
            <Text style={s.h2}>Arkadaşını bul</Text>
            <Field
              label="Arkadaşının tam kullanıcı adı"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              maxLength={30}
            />
            <Button
              label="Kullanıcı adını ara"
              secondary
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const result = await findCommunityProfile(search);
                  setFound(result);
                }, 'Arama tamamlandı. Sonuç yoksa kullanıcı adını kontrol et.')
              }
            />
            {found
              .filter((p) => p.user_id !== auth.user?.id)
              .map((p) => (
                <View key={p.user_id} style={{ gap: 8 }}>
                  <Text style={s.h3}>
                    {p.display_name} · @{p.handle}
                  </Text>
                  <Button
                    label="Arkadaşlık isteği gönder"
                    disabled={busy}
                    onPress={() =>
                      void run(
                        () => communityAction('request', p.handle),
                        'İsteğin gönderildi; karşı tarafın onayı bekleniyor.',
                      )
                    }
                  />
                  <Button
                    label="Bu kişiyi engelle"
                    secondary
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        await communityAction('block', p.user_id);
                        setFound([]);
                      }, 'Kişi engellendi.')
                    }
                  />
                </View>
              ))}
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Arkadaşlar ve istekler</Text>
            {!home.connections.length && (
              <Text style={s.muted}>Henüz arkadaşlık bağlantın yok.</Text>
            )}
            {home.connections.map((p) => (
              <View key={p.user_id} style={{ gap: 8 }}>
                <Text style={s.h3}>
                  {p.display_name} · @{p.handle}
                </Text>
                <Text style={s.muted}>
                  {p.status === 'accepted'
                    ? 'Arkadaşın'
                    : p.incoming
                      ? 'Sana istek gönderdi'
                      : 'Onayı bekleniyor'}
                </Text>
                {p.status === 'pending' && p.incoming && (
                  <>
                    <Button
                      label={p.handle + ' isteğini kabul et'}
                      disabled={busy}
                      onPress={() =>
                        void run(
                          () => communityAction('accept', p.user_id),
                          'Arkadaşlık kabul edildi.',
                        )
                      }
                    />
                    <Button
                      label={p.handle + ' isteğini reddet'}
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void run(() => communityAction('reject', p.user_id), 'İstek kaldırıldı.')
                      }
                    />
                  </>
                )}
                <Button
                  label={p.handle + ' bağlantısını kaldır'}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(() => communityAction('remove', p.user_id), 'Bağlantı kaldırıldı.')
                  }
                />
                <Button
                  label={p.handle + ' engelle'}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(() => communityAction('block', p.user_id), 'Kişi engellendi.')
                  }
                />
              </View>
            ))}
          </View>
          {!!home.blocked.length && (
            <View style={s.card}>
              <Text style={s.h2}>Engellediklerin</Text>
              {home.blocked.map((p, i) => (
                <Button
                  key={p.blocked_id}
                  label={`Engellenen kişi ${i + 1} · engeli kaldır`}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(
                      () => communityAction('unblock', p.blocked_id),
                      'Engel kaldırıldı; arkadaşlık otomatik kurulmadı.',
                    )
                  }
                />
              ))}
            </View>
          )}
          <View style={s.card}>
            <Text style={s.h2}>Bir tarifini paylaş</Text>
            <Text style={s.muted}>
              Yalnızca seçtiğin tarifin adı, temel porsiyonu, malzemeleri ve adımları paylaşılır.
              Kişisel notların veya videoların aktarılmaz.
            </Text>
            {state.recipes
              .filter((r) => r.id.startsWith('custom-'))
              .slice(0, 20)
              .map((r) => (
                <View key={r.id} style={{ gap: 6 }}>
                  <Button
                    label={r.title + ' paylaşımını hazırla'}
                    secondary
                    onPress={() => setSharing(r.id)}
                  />
                  {sharing === r.id && (
                    <>
                      <Text style={s.text}>
                        {r.title} ·{' '}
                        {home.profile!.is_public ? 'Tüm üyelere' : 'Onaylanmış arkadaşlarına'}{' '}
                        yayımlanacak. İçeriğin paylaşım hakkının sana ait olduğundan emin ol.
                      </Text>
                      <Button
                        label="Tarifimi yayımla"
                        disabled={busy}
                        onPress={() =>
                          void run(async () => {
                            await publishRecipe(r, allIngredients(state));
                            setSharing(null);
                          }, 'Tarifin yayımlandı.')
                        }
                      />
                      <Button
                        label="Paylaşımdan vazgeç"
                        secondary
                        onPress={() => setSharing(null)}
                      />
                    </>
                  )}
                </View>
              ))}
            <Button
              label="Kendi tarifimi oluştur"
              secondary
              onPress={() => router.push('/new-recipe')}
            />
          </View>
          <Text style={s.h2}>Paylaşılan tarifler</Text>
          {!home.posts.length && <Text style={s.muted}>Henüz görebileceğin paylaşım yok.</Text>}
          {home.posts.map((p) => (
            <Post
              key={p.id}
              post={p}
              mine={p.owner_id === auth.user?.id}
              remove={() => void run(() => removeCommunityPost(p.id), 'Paylaşım kaldırıldı.')}
              report={() => setReporting(p.owner_id)}
            />
          ))}
          {reporting && (
            <View style={s.card}>
              <Field
                label="Bildirim nedeni"
                multiline
                value={reason}
                onChangeText={setReason}
                maxLength={500}
              />
              <Button
                label="İnceleme için bildir"
                disabled={busy || reason.trim().length < 5}
                onPress={() =>
                  void run(async () => {
                    await reportCommunityProfile(reporting, reason);
                    setReporting(null);
                    setReason('');
                  }, 'Bildirim kaydedildi. İnceleme ekibi kurulumu tamamlandığında değerlendirilebilir.')
                }
              />
              <Button label="Bildirimi iptal et" secondary onPress={() => setReporting(null)} />
            </View>
          )}
        </>
      )}
    </>
  );
}
function Post({
  post,
  mine,
  remove,
  report,
}: {
  post: CommunityPost;
  mine: boolean;
  remove: () => void;
  report: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <View style={s.card}>
      <Text style={s.h2}>{post.recipe.title}</Text>
      <Text style={s.muted}>{post.recipe.servings} kişilik · Kullanıcı paylaşımı</Text>
      <Button
        label={open ? 'Tarifi kapat' : post.recipe.title + ' detaylarını aç'}
        secondary
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text style={s.h3}>Malzemeler</Text>
          {post.recipe.ingredients.map((i, n) => (
            <Text style={s.text} key={n}>
              {i}
            </Text>
          ))}
          <Text style={s.h3}>Yapılışı</Text>
          {post.recipe.steps.map((t, n) => (
            <Text style={s.text} key={n}>
              {n + 1}. {t}
            </Text>
          ))}
          <SharePanel
            title={post.recipe.title}
            text={[post.recipe.title, ...post.recipe.ingredients, ...post.recipe.steps].join('\n')}
          />
        </>
      )}
      {mine ? (
        <Button
          label={confirm ? 'Paylaşımı kaldırmayı onayla' : 'Paylaşımımı kaldır'}
          secondary
          onPress={() => (confirm ? remove() : setConfirm(true))}
        />
      ) : (
        <Button label="Bu paylaşımı bildir" secondary onPress={report} />
      )}
    </View>
  );
}
