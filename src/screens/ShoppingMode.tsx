import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { amountLabel, dateLabel } from '../domain/logic';
import {
  resolveShoppingScope,
  shoppingChangeIsCurrent,
  shoppingGroups,
  shoppingSession,
  type ShoppingChange,
  type ShoppingRow,
  type ShoppingScope,
} from '../domain/shoppingSession';
import { Text } from '../ui/Text';
import { Button, Chip, Empty, Field, Notice, Page } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

export function ShoppingMode() {
  const params = useLocalSearchParams<{
    week?: string | string[];
    savedList?: string | string[];
  }>();
  const { week } = useApp();
  const scope = resolveShoppingScope(params, week);
  if (!scope)
    return (
      <Page>
        <Empty
          title="Liste bağlantısı geçersiz"
          description="Listemden bir hafta veya kayıtlı liste seç."
        >
          <Button label="Listeme dön" onPress={() => router.replace('/list')} />
        </Empty>
      </Page>
    );
  return <Session key={JSON.stringify(scope)} scope={scope} />;
}

function Session({ scope }: { scope: ShoppingScope }) {
  const { state, getState, dispatch, setWeek } = useApp();
  const [query, setQuery] = useState('');
  const [remainingOnly, setRemainingOnly] = useState(true);
  const [detail, setDetail] = useState<string | null>(null);
  const [undo, setUndo] = useState<(ShoppingChange & { name: string }) | null>(null);
  const [notice, setNotice] = useState('');
  const session = shoppingSession(state, scope);
  const leave = () => {
    if (scope.kind === 'week') {
      setWeek(scope.week);
      router.replace('/list');
    } else router.replace({ pathname: '/saved-list/[id]', params: { id: scope.id } });
  };
  if (!session)
    return (
      <Page>
        <Empty title="Liste bulunamadı" description="Bu kayıtlı liste kaldırılmış olabilir.">
          <Button label="Listeme dön" onPress={() => router.replace('/list')} />
        </Empty>
      </Page>
    );
  const groups = shoppingGroups(session.rows, query, remainingOnly);
  const canUndo = !!undo && shoppingChangeIsCurrent(state, undo);
  const check = (row: ShoppingRow) => {
    const change: ShoppingChange = {
      scope,
      rowId: row.id,
      fingerprint: row.fingerprint,
      from: row.checked,
      to: !row.checked,
    };
    if (!shoppingChangeIsCurrent(getState(), change)) {
      setNotice('Liste değişti. Güncel miktarı kontrol edip tekrar işaretle.');
      return;
    }
    dispatch({ type: 'shoppingCheck', value: change });
    setUndo({ ...change, from: change.to, to: change.from, name: row.name });
    setNotice('');
  };
  return (
    <Page maxWidth={700} gap={16}>
      <View style={{ gap: 6 }}>
        <Text style={s.eyebrow}>MAĞAZADA ALIŞVERİŞ</Text>
        <Text style={s.title}>Listeni takip et</Text>
        <Text style={s.muted}>
          {scope.kind === 'week'
            ? dateLabel(scope.week) + ' haftası'
            : session.name + ' · Kayıtlı liste'}
        </Text>
      </View>
      <View style={[s.card, { backgroundColor: colors.peach }]} testID="shopping-progress">
        <View style={s.between}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.h2}>
              {session.remaining
                ? session.remaining + ' ürün kaldı'
                : session.rows.length
                  ? 'Listen tamamlandı'
                  : 'Alınacak ürün yok'}
            </Text>
            <Text style={s.text}>
              {session.done} / {session.rows.length} ürün işaretlendi
            </Text>
          </View>
          <Ionicons
            name={
              session.rows.length && !session.remaining
                ? 'checkmark-circle-outline'
                : 'basket-outline'
            }
            size={36}
            color={colors.green}
          />
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Alışveriş ilerlemesi"
          accessibilityValue={{
            min: 0,
            max: session.rows.length || 1,
            now: session.done,
            text: `${session.done} / ${session.rows.length} ürün işaretlendi`,
          }}
          style={{ height: 7, backgroundColor: colors.surface, borderRadius: 8 }}
        >
          <View
            style={{
              height: 7,
              borderRadius: 8,
              backgroundColor: colors.green,
              width: `${session.rows.length ? (session.done / session.rows.length) * 100 : 0}%`,
            }}
          />
        </View>
        <Text style={[s.muted, { fontSize: 12 }]}>
          Aldığın ürüne dokun. İşaretlerin listene kaydedilir.
        </Text>
      </View>
      {!!session.rows.length && (
        <>
          <Field
            label="Listede ürün ara"
            placeholder="Örn. soğan, yoğurt…"
            value={query}
            onChangeText={setQuery}
            maxLength={100}
          />
          <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
            <Chip
              label={'Kalanlar (' + session.remaining + ')'}
              selected={remainingOnly}
              onPress={() => setRemainingOnly(true)}
            />
            <Chip
              label={'Tümü (' + session.rows.length + ')'}
              selected={!remainingOnly}
              onPress={() => setRemainingOnly(false)}
            />
          </View>
        </>
      )}
      {!!notice && <Notice text={notice} />}
      {undo && (
        <View style={[s.card, { padding: 14 }]} accessibilityLiveRegion="polite">
          <Text style={s.text}>
            {undo.name}
            {undo.from ? ' alındı olarak işaretlendi.' : ' yeniden kalanlara eklendi.'}
          </Text>
          {canUndo ? (
            <Button
              label="Son işareti geri al"
              secondary
              icon="arrow-undo-outline"
              onPress={() => {
                if (!shoppingChangeIsCurrent(getState(), undo)) {
                  setNotice('Bu ürün değişti. Güncel listeyi kontrol et.');
                  setUndo(null);
                  return;
                }
                dispatch({ type: 'shoppingCheck', value: undo });
                setNotice(undo.name + ' için son işaret geri alındı.');
                setUndo(null);
              }}
            />
          ) : (
            <Text style={s.muted}>Ürün değiştiği için son işaret geri alınamaz.</Text>
          )}
        </View>
      )}
      {session.rows.length === 0 ? (
        <Empty
          title="Burada işaretlenecek ürün yok"
          description={
            session.covered
              ? 'Tarif malzemelerin evden karşılanıyor. Listene ihtiyaç duyduğun ek ürünleri ekleyebilirsin.'
              : 'Listene yemek veya ek ürün eklediğinde burada görünür.'
          }
        />
      ) : session.remaining === 0 && remainingOnly ? (
        <Empty
          title="Hepsi işaretlendi!"
          description="Kontrol etmek veya bir işareti kaldırmak için tüm ürünleri aç."
        >
          <Button
            label="Tüm ürünleri göster"
            secondary
            onPress={() => {
              setQuery('');
              setRemainingOnly(false);
            }}
          />
        </Empty>
      ) : groups.length === 0 ? (
        <Empty
          title="Bu görünümde ürün bulunamadı"
          description="Aramayı temizle veya işaretlediğin ürünler için tümünü göster."
        >
          <Button
            label="Aramayı temizle ve tümünü göster"
            secondary
            onPress={() => {
              setQuery('');
              setRemainingOnly(false);
            }}
          />
        </Empty>
      ) : null}
      {groups.map((group) => (
        <View key={group.category} style={[s.card, { padding: 16, gap: 8 }]}>
          <Text style={[s.h3, { paddingBottom: 4 }]}>{group.category}</Text>
          {group.rows.map((row) => (
            <View key={row.id} style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={row.name + ', ' + row.amount}
                accessibilityState={{ checked: row.checked }}
                aria-checked={row.checked}
                onPress={() => check(row)}
                style={({ pressed }) => [
                  s.row,
                  { minHeight: 76, paddingVertical: 12, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name={row.checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={30}
                  color={row.checked ? colors.green : colors.muted}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[
                      s.h3,
                      {
                        textDecorationLine: row.checked ? 'line-through' : 'none',
                        color: row.checked ? colors.muted : colors.ink,
                      },
                    ]}
                  >
                    {row.name}
                  </Text>
                  <Text style={s.text}>{row.amount}</Text>
                </View>
              </Pressable>
              {row.item && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={row.name + ' hangi yemeklerde?'}
                    accessibilityState={{ expanded: detail === row.id }}
                    onPress={() => setDetail(detail === row.id ? null : row.id)}
                    style={[s.between, { minHeight: 44, paddingBottom: 6 }]}
                  >
                    <Text style={[s.muted, { flex: 1, fontSize: 12 }]}>Hangi yemekler için?</Text>
                    <Ionicons
                      name={detail === row.id ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.muted}
                    />
                  </Pressable>
                  {detail === row.id && (
                    <View style={{ paddingBottom: 14, gap: 6 }}>
                      <Text style={s.text}>{row.item.recipeTitles.join(' · ')}</Text>
                      <Text style={s.muted}>
                        Toplam ihtiyaç: {amountLabel(row.item.totalGrams)}
                      </Text>
                      <Text style={s.muted}>
                        Evden karşılanan: {amountLabel(row.item.pantryGrams)}
                      </Text>
                      <Text style={s.h3}>Alınacak: {row.amount}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      ))}
      {session.covered > 0 && (
        <Text style={s.muted}>
          {session.covered} malzeme evden karşılandığı için bu listede yok.
        </Text>
      )}
      <Button label="Liste düzenlemeye dön" secondary onPress={leave} />
    </Page>
  );
}
