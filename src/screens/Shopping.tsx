import { Text } from '../ui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { ShoppingItem } from '../domain/model';
import { amountLabel, buildShoppingList, dateLabel, itemKey, mealsInWeek } from '../domain/logic';
import { makeId } from '../domain/state';
import { Button, Chip, Empty, Field, IconButton, Notice, Page, WeekPicker } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { MarketEntry } from '../ui/MarketEntry';
import { Extras } from '../ui/Extras';
import { SharePanel } from '../ui/SharePanel';
import { shoppingText } from '../domain/experience';
import { allIngredients } from '../domain/ingredients';

function ListRows({
  items,
  checked,
  onCheck,
  onPantry,
}: {
  items: ShoppingItem[];
  checked: string[];
  onCheck: (key: string) => void;
  onPantry?: (item: ShoppingItem) => void;
}) {
  const groups = [...new Set(items.map((i) => i.category))];
  return (
    <>
      {groups.map((category) => (
        <View key={category} style={[s.card, { gap: 8, padding: 16 }]}>
          <Text style={[s.h3, { fontSize: 15 }]}>{category}</Text>
          <View>
            {items
              .filter((i) => i.category === category)
              .map((item) => {
                const done = checked.includes(itemKey(item));
                return (
                  <View
                    key={item.ingredientId}
                    style={[
                      s.row,
                      { gap: 6, borderBottomWidth: 1, borderColor: colors.line, minHeight: 64 },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.name + ', ' + amountLabel(item.grams)}
                      accessibilityState={{ checked: done }}
                      aria-checked={done}
                      onPress={() => onCheck(itemKey(item))}
                      style={[s.row, { flex: 1, minHeight: 60, gap: 11 }]}
                    >
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'ellipse-outline'}
                        color={done ? colors.green : '#A8A19A'}
                        size={24}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            s.text,
                            {
                              textDecorationLine: done ? 'line-through' : 'none',
                              color: done ? colors.muted : colors.ink,
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.pantryGrams > 0 && (
                          <Text style={[s.muted, { fontSize: 11 }]}>
                            {amountLabel(item.pantryGrams)} evden düşüldü
                          </Text>
                        )}
                      </View>
                      <Text style={[s.text, { fontWeight: '600', fontSize: 14 }]}>
                        {amountLabel(item.grams)}
                      </Text>
                    </Pressable>
                    {onPantry && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.name + ' evde var'}
                        onPress={() => onPantry(item)}
                        style={{
                          width: 46,
                          minHeight: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                      >
                        <Ionicons name="home-outline" size={18} color={colors.muted} />
                        <Text style={{ fontSize: 10, color: colors.muted }}>Evde</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
          </View>
        </View>
      ))}
    </>
  );
}
export function Shopping() {
  const { state, dispatch, week } = useApp();
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [pane, setPane] = useState<'week' | 'saved'>('week');
  const [saving, setSaving] = useState(false);
  const [showCovered, setShowCovered] = useState(false);
  const meals = mealsInWeek(state, week);
  const all = buildShoppingList(meals, state.recipes, state.pantry, allIngredients(state));
  const items = all.filter((i) => i.grams > 0);
  const covered = all.filter((i) => i.grams === 0);
  const checked = state.checked[week] ?? [];
  const extras = state.experience.extras.filter((i) => i.week === week);
  const done = items.filter((i) => checked.includes(itemKey(i))).length;
  const save = () => {
    dispatch({
      type: 'saveList',
      value: {
        id: makeId('list'),
        name: name.trim() || dateLabel(week) + ' haftası',
        createdAt: new Date().toISOString(),
        week,
        items: JSON.parse(JSON.stringify(items)),
        extras: JSON.parse(JSON.stringify(extras)),
        checked: checked.filter((key) => items.some((i) => itemKey(i) === key)),
      },
    });
    setName('');
    setSaving(false);
    setNotice('Liste kaydedildi. Menü değişse de bu kopya aynı kalır.');
  };
  return (
    <Page maxWidth={780}>
      <View style={s.between}>
        <Text style={[s.title, { flex: 1 }]}>Alışveriş listem</Text>
        {pane === 'week' && (items.length > 0 || extras.length > 0) && (
          <IconButton
            label="Bu listeyi sakla"
            icon="bookmark-outline"
            onPress={() => setSaving(!saving)}
          />
        )}
      </View>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <Chip label="Bu hafta" selected={pane === 'week'} onPress={() => setPane('week')} />
        <Chip label="Kayıtlı" selected={pane === 'saved'} onPress={() => setPane('saved')} />
        <Chip
          label="Ortak liste"
          selected={false}
          onPress={() => router.push('/shared-household')}
        />
      </View>
      {notice !== '' && <Notice text={notice} />}
      {pane === 'week' ? (
        <>
          <MarketEntry />
          <WeekPicker />
          {(items.length > 0 || extras.length > 0) && (
            <Button
              label="Alışverişe başla"
              icon="basket-outline"
              onPress={() => router.push({ pathname: '/shopping-mode', params: { week } })}
            />
          )}
          {saving && (
            <View style={s.card}>
              <Text style={s.h3}>Bu listeyi sakla</Text>
              <Field
                label="Liste adı"
                placeholder={dateLabel(week) + ' haftası'}
                maxLength={100}
                value={name}
                onChangeText={setName}
              />
              <Button
                label="Listeyi kaydet"
                onPress={save}
                disabled={items.length === 0 && extras.length === 0}
                icon="bookmark-outline"
              />
              <Button label="Vazgeç" secondary onPress={() => setSaving(false)} />
            </View>
          )}
          {meals.length === 0 ? (
            <Empty
              title="Önce sofranı planla"
              description="Yemeklerini seç; malzemeler burada birleşsin."
            >
              <Button label="Haftama git" onPress={() => router.navigate('/plan')} />
            </Empty>
          ) : (
            <>
              <View style={{ gap: 10 }}>
                <View style={s.between}>
                  <Text style={s.h3}>{items.length - done} malzeme kaldı</Text>
                  <Text style={[s.muted, { fontSize: 12 }]}>
                    {done}/{items.length} tamamlandı
                  </Text>
                </View>
                <View style={{ height: 5, backgroundColor: colors.line, borderRadius: 5 }}>
                  <View
                    style={{
                      height: 5,
                      width: ((items.length ? (done / items.length) * 100 : 100) +
                        '%') as `${number}%`,
                      backgroundColor: colors.green,
                      borderRadius: 5,
                    }}
                  />
                </View>
                <Text style={[s.muted, { fontSize: 12 }]}>
                  Evde olanı “Evde” ile çıkar, aldığını işaretle.
                </Text>
              </View>
              {items.length === 0 ? (
                <Empty
                  title="Malzemeler evde!"
                  description="Tarif malzemelerin evden karşılanıyor. Ek ürünlerini aşağıda görebilirsin."
                />
              ) : (
                <ListRows
                  items={items}
                  checked={checked}
                  onCheck={(key) => dispatch({ type: 'check', week, key })}
                  onPantry={(item) => {
                    dispatch({ type: 'pantry', id: item.ingredientId, grams: item.totalGrams });
                    setNotice(
                      item.name +
                        ' listeden çıkarıldı. Evden karşılananlar bölümünden geri alabilirsin.',
                    );
                  }}
                />
              )}
              {covered.length > 0 && (
                <View style={[s.card, { backgroundColor: colors.soft }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Evden karşılananlar"
                    accessibilityState={{ expanded: showCovered }}
                    onPress={() => setShowCovered(!showCovered)}
                    style={[s.between, { minHeight: 44 }]}
                  >
                    <Text style={s.h3}>Evden karşılananlar ({covered.length})</Text>
                    <Ionicons
                      name={showCovered ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                  {showCovered &&
                    covered.map((item) => (
                      <View key={item.ingredientId} style={s.between}>
                        <Text style={[s.muted, { flex: 1 }]}>
                          {item.name} · {amountLabel(item.totalGrams)}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={item.name + ' listeye geri al'}
                          onPress={() =>
                            dispatch({ type: 'pantry', id: item.ingredientId, grams: 0 })
                          }
                          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
                        >
                          <Text style={{ color: colors.green, fontWeight: '600' }}>Geri al</Text>
                        </Pressable>
                      </View>
                    ))}
                </View>
              )}
              <Text style={[s.muted, { fontSize: 11 }]}>
                Menüne göre gereken net miktarlar. Bu demo markete sipariş göndermez.
              </Text>
            </>
          )}
          <Extras
            items={extras}
            onToggle={(item) =>
              dispatch({ type: 'extra', value: { ...item, checked: !item.checked } })
            }
            onRemove={(id) => dispatch({ type: 'removeExtra', id })}
            editing
          />
          {(items.length > 0 || extras.length > 0) && (
            <SharePanel
              title={dateLabel(week) + ' alışveriş listem'}
              text={shoppingText(dateLabel(week) + ' alışveriş listem', items, checked, extras)}
            />
          )}
          <View style={s.card}>
            <Text style={s.h2}>Listemle devam</Text>
            {!!meals.length && (
              <Button
                label="Yemeklerimi pişirmeye geç"
                icon="restaurant-outline"
                onPress={() => router.push('/ready-to-cook')}
              />
            )}
            <Button
              label="Market sepetine hazırlık"
              secondary
              icon="cart-outline"
              onPress={() => router.push('/basket-review')}
            />
            <Button label="Bütçe ve fiyatlar" secondary onPress={() => router.push('/budget')} />
            <Button label="Düzenli ürünler" secondary onPress={() => router.push('/staples')} />
          </View>
        </>
      ) : (
        <>
          {state.savedLists.length === 0 ? (
            <Empty
              title="Listelerin burada biriksin"
              description="Haftalık listendeki yer imi simgesiyle bir kopya saklayabilirsin."
            />
          ) : (
            state.savedLists.map((list) => (
              <Pressable
                key={list.id}
                accessibilityRole="button"
                accessibilityLabel={list.name + ' listesini aç'}
                onPress={() =>
                  router.push({ pathname: '/saved-list/[id]', params: { id: list.id } })
                }
                style={[s.card, s.between]}
              >
                <Ionicons name="bookmark-outline" size={24} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.h3}>{list.name}</Text>
                  <Text style={s.muted}>
                    {list.items.length + (list.extras?.length ?? 0)} ürün ·{' '}
                    {dateLabel(list.createdAt.slice(0, 10))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))
          )}
        </>
      )}
    </Page>
  );
}
export function SavedListScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const [confirm, setConfirm] = useState(false);
  const list = state.savedLists.find((l) => l.id === params.id);
  if (!list)
    return (
      <Page>
        <Empty
          title="Liste bulunamadı"
          description="Kayıtlı listelerinden başka birini açabilirsin."
        />
      </Page>
    );
  return (
    <Page>
      <Text style={s.eyebrow}>KAYITLI LİSTE</Text>
      <Text style={s.title}>{list.name}</Text>
      <Text style={s.muted}>
        {dateLabel(list.week)} haftasının kaydedilmiş kopyası. Menü ve evdeki stok
        değişikliklerinden etkilenmez.
      </Text>
      <MarketEntry />
      {(list.items.some((item) => item.grams > 0) || !!list.extras?.length) && (
        <Button
          label="Alışverişe başla"
          icon="basket-outline"
          onPress={() =>
            router.push({ pathname: '/shopping-mode', params: { savedList: list.id } })
          }
        />
      )}
      <SharePanel
        title={list.name}
        text={shoppingText(list.name, list.items, list.checked, list.extras)}
      />
      <ListRows
        items={list.items}
        checked={list.checked}
        onCheck={(key) => dispatch({ type: 'checkSaved', id: list.id, key })}
      />
      <Extras
        items={list.extras ?? []}
        onToggle={(item) => dispatch({ type: 'checkSavedExtra', id: list.id, extraId: item.id })}
      />
      {confirm ? (
        <View style={s.card}>
          <Text style={s.text}>“{list.name}” kalıcı olarak silinsin mi?</Text>
          <Button
            label="Evet, listeyi sil"
            onPress={() => {
              dispatch({ type: 'deleteList', id: list.id });
              router.back();
            }}
          />
          <Button label="Vazgeç" secondary onPress={() => setConfirm(false)} />
        </View>
      ) : (
        <Button label="Listeyi sil" secondary onPress={() => setConfirm(true)} />
      )}
    </Page>
  );
}
