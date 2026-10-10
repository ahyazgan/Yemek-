import { Text } from '../ui/Text';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { amountLabel, localDate } from '../domain/logic';
import { z } from 'zod';
import { pantryDateLabel } from '../domain/companion';
import { budgetLabels, dietLabels } from '../domain/model';
import { MarketEntry } from '../ui/MarketEntry';
import { Button, Chip, Field, IconButton, Notice, Page } from '../ui/components';
import { styles as s } from '../ui/theme';
import { useAuth } from '../auth/AuthProvider';
import { IngredientCreator } from '../ui/IngredientCreator';

export function Kitchen() {
  const auth = useAuth();
  const { state, dispatch } = useApp();
  const ingredients = allIngredients(state);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('onion');
  const [amount, setAmount] = useState(String(state.pantry.onion ?? 0));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [stockDate, setStockDate] = useState(state.experience.tools.pantryDates.onion?.date ?? '');
  const [dateKind, setDateKind] = useState<'expiry' | 'opened'>(
    state.experience.tools.pantryDates.onion?.kind ?? 'expiry',
  );
  const matches = ingredients.filter((i) =>
    i.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')),
  );
  const save = () => {
    if (stockDate && !z.iso.date().safeParse(stockDate).success) {
      setError('Tarihi YYYY-AA-GG biçiminde gir veya boş bırak.');
      return;
    }
    const n = Number(amount.replace(',', '.'));
    if (amount.trim() === '' || !Number.isFinite(n) || n < 0 || n > 10000000) {
      setError('0 ile 10.000.000 arasında gram miktarı gir.');
      return;
    }
    dispatch({ type: 'pantry', id: selected, grams: n });
    const pantryDates = { ...state.experience.tools.pantryDates };
    if (stockDate) pantryDates[selected] = { date: stockDate, kind: dateKind };
    else delete pantryDates[selected];
    dispatch({ type: 'tools', value: { pantryDates } });
    setNotice('Evdeki miktar güncellendi. Haftalık listen yeniden hesaplandı.');
    setError('');
  };
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>SOFRANIN KÜÇÜK HAFIZASI</Text>
      <Text style={s.title}>Benim mutfağım</Text>
      <View style={s.card}>
        <Text style={s.h2}>
          {auth.user ? 'Merhaba, ' + (auth.user.name || 'Sofralı') : 'Sana ait bir sofra'}
        </Text>
        <Text style={s.muted}>
          {auth.user
            ? auth.mode === 'demo'
              ? 'Demo hesabı · Bu cihazda'
              : auth.user.email
            : 'Misafir modu · Kayıtların bu cihazda saklanır'}
        </Text>
        <Button
          label={auth.user ? 'Hesabımı yönet' : 'Giriş yap / hesap oluştur'}
          icon="person-outline"
          onPress={() => router.push('/account')}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Tarif defterim</Text>
        <Button
          label="Arkadaş sofraları"
          secondary
          icon="people-outline"
          onPress={() => router.push('/community')}
        />
        <Button
          label="Pişirme sırası"
          secondary
          icon="restaurant-outline"
          onPress={() => router.push('/ready-to-cook')}
        />
        <Button
          label="Koleksiyonlarım"
          secondary
          icon="albums-outline"
          onPress={() => router.push('/collections')}
        />
        <Button
          label={'Favorilerim (' + state.experience.favorites.length + ')'}
          secondary
          icon="heart-outline"
          onPress={() => router.push('/favorites')}
        />
        <Button
          label="Benim tariflerim"
          secondary
          icon="book-outline"
          onPress={() => router.push('/my-recipes')}
        />
        <Button
          label="Pişirdiklerim"
          secondary
          icon="restaurant-outline"
          onPress={() => router.push('/history')}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>{state.profile?.people} kişilik bir sofra</Text>
        <Text style={s.muted}>
          {state.profile?.diets.map((d) => dietLabels[d]).join(' · ') || 'Tüm beslenme seçenekleri'}{' '}
          · {state.profile && budgetLabels[state.profile.budget]}
        </Text>
        <Button
          label="Tercihlerimi düzenle"
          secondary
          onPress={() => router.push('/preferences')}
        />
        <Button label="Damak zevkim ve zamanım" secondary onPress={() => router.push('/taste')} />
        <Button label="Ekipmanlarım" secondary onPress={() => router.push('/equipment')} />
        <Button label="Bütçem ve harcamalarım" secondary onPress={() => router.push('/budget')} />
        <Button label="Düzenli aldıklarım" secondary onPress={() => router.push('/staples')} />
        <Button label="Hatırlatmalarım" secondary onPress={() => router.push('/notifications')} />
        <Button label="Ev halkıyla paylaş" secondary onPress={() => router.push('/household')} />
      </View>
      <Text style={s.h2}>Evde neler var?</Text>
      <Button label="Kendi malzemelerim" secondary onPress={() => router.push('/ingredients')} />
      <Button
        label="Evdekilerle ne pişirsem?"
        secondary
        icon="leaf-outline"
        onPress={() => router.push('/pantry-recipes')}
      />
      <Text style={s.muted}>
        Buradaki miktar haftanın toplam ihtiyacından bir kez düşülür. Pişirdikçe stoklarını kendin
        güncelle; farklı haftalar aynı mevcut stoğu kullanarak hesaplanır.
      </Text>
      {Object.entries(state.pantry)
        .filter(([, g]) => g > 0)
        .sort(([a], [b]) =>
          (state.experience.tools.pantryDates[a]?.date ?? '9999').localeCompare(
            state.experience.tools.pantryDates[b]?.date ?? '9999',
          ),
        )
        .map(([id, g]) => (
          <View key={id} style={[s.card, s.between, { padding: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.h3}>{ingredients.find((i) => i.id === id)?.name}</Text>
              <Text style={s.muted}>{amountLabel(g)}</Text>
              {state.experience.tools.pantryDates[id] && (
                <Text style={s.muted}>
                  {pantryDateLabel(state.experience.tools.pantryDates[id], localDate(new Date()))}
                </Text>
              )}
            </View>
            <IconButton
              label={`${ingredients.find((i) => i.id === id)?.name} miktarını düzenle`}
              icon="create-outline"
              onPress={() => {
                setSelected(id);
                setAmount(String(g));
                setStockDate(state.experience.tools.pantryDates[id]?.date ?? '');
                setDateKind(state.experience.tools.pantryDates[id]?.kind ?? 'expiry');
                setSearch('');
              }}
            />
            <IconButton
              label={`${ingredients.find((i) => i.id === id)?.name} stoktan çıkar`}
              icon="close"
              onPress={() => dispatch({ type: 'pantry', id, grams: 0 })}
            />
          </View>
        ))}
      <View style={s.card}>
        <Text style={s.h3}>Malzeme ekle / güncelle</Text>
        <Field
          label="Malzeme ara"
          value={search}
          onChangeText={setSearch}
          placeholder="Örn. soğan, pirinç"
        />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {matches.slice(0, 8).map((i) => (
            <Chip
              key={i.id}
              label={i.name}
              selected={selected === i.id}
              onPress={() => {
                setSelected(i.id);
                setAmount(String(state.pantry[i.id] ?? 0));
                setStockDate(state.experience.tools.pantryDates[i.id]?.date ?? '');
                setDateKind(state.experience.tools.pantryDates[i.id]?.kind ?? 'expiry');
                setNotice('');
              }}
            />
          ))}
        </View>
        {matches.length > 8 && <Text style={s.muted}>Diğer malzemeler için arama yap.</Text>}
        {matches.length === 0 && <Text style={s.muted}>Bu isimde malzeme yok.</Text>}
        <Field
          label={`${ingredients.find((i) => i.id === selected)?.name} · evdeki miktar (g)`}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Field
          label="Malzeme tarihi (YYYY-AA-GG, isteğe bağlı)"
          value={stockDate}
          onChangeText={setStockDate}
          maxLength={10}
        />
        <View style={s.row}>
          <Chip
            label="Etiketteki tarih"
            selected={dateKind === 'expiry'}
            onPress={() => setDateKind('expiry')}
          />
          <Chip
            label="Açılma tarihi"
            selected={dateKind === 'opened'}
            onPress={() => setDateKind('opened')}
          />
        </View>
        <Text style={[s.muted, { fontSize: 12 }]}>
          Tarihi sen girersin. Uygulama yiyeceğin tüketilebilirliğine karar vermez.
        </Text>
        {error !== '' && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button label="Evdeki miktarı kaydet" onPress={save} />
        <IngredientCreator
          initialName={search}
          onCreated={(item) => {
            setSelected(item.id);
            setAmount(String(state.pantry[item.id] ?? 0));
            setStockDate('');
            setSearch('');
            setNotice('Malzeme seçildi. Evdeki miktarını girip kaydedebilirsin.');
          }}
        />
        {notice !== '' && <Notice text={notice} />}
      </View>
      <MarketEntry />
      <Button label="Yardım ve sık sorulanlar" secondary onPress={() => router.push('/help')} />
      <Button label="Bağlantılar ve servisler" secondary onPress={() => router.push('/services')} />
      <Text style={[s.muted, { fontSize: 12 }]}>
        Sofra, Yazgan çatısı altında geliştirilen geçici adlı bir üründür. Misafir ve demo modunda
        kayıtlar bu cihazda kalır. Hesap ve servis durumunu Hesabım bölümünden görebilirsin.
      </Text>
    </Page>
  );
}
