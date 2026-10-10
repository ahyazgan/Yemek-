import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { budgetDinners, money, parseMoney, weeklyEstimate } from '../domain/companion';
import { dateLabel, localDate, weekDays } from '../domain/logic';
import { makeId } from '../domain/state';
import { Button, Chip, Field, IconButton, Notice, Page, WeekPicker } from '../ui/components';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';

export function Budget() {
  const { state, dispatch, week } = useApp();
  return <BudgetWeek key={week} week={week} state={state} dispatch={dispatch} />;
}
function BudgetWeek({
  week,
  state,
  dispatch,
}: Pick<ReturnType<typeof useApp>, 'week' | 'state' | 'dispatch'>) {
  const tools = state.experience.tools;
  const saved = tools.budgets[week];
  const [limit, setLimit] = useState(saved ? String(saved.totalCents / 100) : '');
  const [reserve, setReserve] = useState(saved ? String(saved.extrasCents / 100) : '0');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('onion');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('1000');
  const [source, setSource] = useState('Kendi fiyat notum');
  const [priceDate, setPriceDate] = useState(localDate(new Date()));
  const [expense, setExpense] = useState('');
  const [store, setStore] = useState('');
  const [expenseDate, setExpenseDate] = useState(localDate(new Date()));
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState(5);
  const [preview, setPreview] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const dictionary = allIngredients(state);
  const estimate = weeklyEstimate(state, week);
  const expenses = tools.expenses.filter((e) => weekDays(week).includes(e.date));
  const spent = expenses.reduce((sum, e) => sum + e.cents, 0);
  const draft = preview ? budgetDinners(state, week, target) : null;
  const select = (id: string) => {
    setSelected(id);
    const note = tools.prices[id];
    setPrice(note ? String(note.cents / 100) : '');
    setWeight(String(note?.packageGrams ?? 1000));
    setSource(note?.source ?? 'Kendi fiyat notum');
    setPriceDate(note?.recordedOn ?? localDate(new Date()));
    setPricesOpen(true);
  };
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>HAFTALIK BÜTÇEM</Text>
      <Text style={s.title}>Sofranın hesabı sende</Text>
      <Text style={s.muted}>
        Kendi fiyat notlarınla planla, yaptığın harcamaları takip et. Marketten canlı fiyat alınmaz.
      </Text>
      <WeekPicker />
      {!!notice && <Notice text={notice} />}
      <View style={[s.card, { backgroundColor: colors.yellow }]}>
        <Text style={s.h3}>Bu hafta kaydettiğin harcama</Text>
        <Text style={s.title}>{money(spent)}</Text>
        <Text style={s.text}>
          {saved
            ? `Hedef ${money(saved.totalCents)} · ${spent > saved.totalCents ? 'Aşım' : 'Kalan'} ${money(Math.abs(saved.totalCents - spent))}`
            : 'Henüz bütçe hedefi belirlemedin.'}
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Bütçeyi paylaştır</Text>
        <Field
          label="Haftalık hedef (TL)"
          keyboardType="decimal-pad"
          value={limit}
          onChangeText={setLimit}
        />
        <Field
          label="Ek ürünlere ayırdığım (TL)"
          keyboardType="decimal-pad"
          value={reserve}
          onChangeText={setReserve}
        />
        <Button
          label="Bütçemi kaydet"
          onPress={() => {
            const totalCents = parseMoney(limit),
              extrasCents = parseMoney(reserve);
            if (
              totalCents === null ||
              extrasCents === null ||
              totalCents <= 0 ||
              extrasCents > totalCents
            )
              return setNotice('Geçerli bir hedef gir. Ek ürün payı toplamı aşamaz.');
            dispatch({
              type: 'tools',
              value: { budgets: { ...tools.budgets, [week]: { totalCents, extrasCents } } },
            });
            setNotice('Haftalık bütçen kaydedildi.');
          }}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Menünün alışveriş tahmini</Text>
        <Text style={s.title}>
          {money(estimate.cents)}
          {estimate.missing ? ' + eksik fiyatlar' : ''}
        </Text>
        <Text style={s.muted}>
          Evdeki miktar düşüldükten sonra, girdiğin paket büyüklüklerine yuvarlanır. Su ve ek
          ürünler bu tutara dahil değildir. Eski fiyat notları güncel market fiyatı sayılmaz.
        </Text>
        {estimate.lines.map((line) => (
          <View key={line.ingredientId} style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.h3}>{line.name}</Text>
              <Text style={s.muted}>
                {line.price
                  ? `${line.packages} paket · ${money(line.cents!)} · ${line.price.recordedOn}`
                  : 'Fiyat girilmedi'}
              </Text>
            </View>
            <IconButton
              label={line.name + ' fiyatını düzenle'}
              icon="create-outline"
              onPress={() => select(line.ingredientId)}
            />
          </View>
        ))}
        {!estimate.lines.length && (
          <Text style={s.muted}>Menüne yemek eklediğinde burada hesaplanır.</Text>
        )}
        <Button
          label={pricesOpen ? 'Fiyat defterini kapat' : 'Fiyat defterimi aç'}
          secondary
          onPress={() => setPricesOpen(!pricesOpen)}
        />
      </View>
      {pricesOpen && (
        <View style={s.card}>
          <Text style={s.h2}>Fiyat defterim</Text>
          <Field label="Fiyat için malzeme ara" value={search} onChangeText={setSearch} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dictionary
              .filter(
                (i) =>
                  i.id !== 'water' &&
                  i.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')),
              )
              .slice(0, 10)
              .map((i) => (
                <Chip
                  key={i.id}
                  label={i.name}
                  selected={selected === i.id}
                  onPress={() => select(i.id)}
                />
              ))}
          </View>
          <Text style={s.h3}>{dictionary.find((i) => i.id === selected)?.name}</Text>
          <Field
            label="Paket fiyatı (TL)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <Field
            label="Paket ağırlığı (g)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <Field label="Fiyatın kaynağı" value={source} onChangeText={setSource} maxLength={100} />
          <Field
            label="Fiyat tarihi (YYYY-AA-GG)"
            value={priceDate}
            onChangeText={setPriceDate}
            maxLength={10}
          />
          <Button
            label="Fiyat notunu kaydet"
            onPress={() => {
              const cents = parseMoney(price),
                packageGrams = Number(weight.replace(',', '.'));
              if (
                cents === null ||
                !Number.isFinite(packageGrams) ||
                packageGrams <= 0 ||
                packageGrams > 10000000 ||
                !source.trim() ||
                !z.iso.date().safeParse(priceDate).success
              )
                return setNotice('Fiyatı, pozitif gramajı, kaynağı ve tarihi kontrol et.');
              dispatch({
                type: 'tools',
                value: {
                  prices: {
                    ...tools.prices,
                    [selected]: {
                      cents,
                      packageGrams,
                      recordedOn: priceDate,
                      source: source.trim(),
                    },
                  },
                },
              });
              setNotice('Fiyat notun kaydedildi; tahmin yenilendi.');
            }}
          />
          {!!tools.prices[selected] && (
            <Button
              label="Bu fiyat notunu kaldır"
              secondary
              onPress={() => {
                const prices = { ...tools.prices };
                delete prices[selected];
                dispatch({ type: 'tools', value: { prices } });
                setPrice('');
              }}
            />
          )}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.h2}>Bütçeme göre menü öner</Text>
        <Text style={s.muted}>
          Yalnızca fiyatı tamamlanmış ve tercihlerine uyan tarifleri kullanır. Mevcut öğünleri
          korur; en ucuz menü garantisi vermez.
        </Text>
        <View style={s.row}>
          {[3, 5, 7].map((n) => (
            <Chip
              key={n}
              label={n + ' akşam'}
              selected={target === n}
              onPress={() => setTarget(n)}
            />
          ))}
        </View>
        <Button label="Bütçeli menüyü önizle" disabled={!saved} onPress={() => setPreview(true)} />
        {draft && (
          <>
            {draft.suggestions.map((m) => (
              <Text key={m.id} style={s.text}>
                {dateLabel(m.date, { weekday: 'long' })} ·{' '}
                {state.recipes.find((r) => r.id === m.recipeId)?.title}
              </Text>
            ))}
            {!!draft.missingCount && (
              <Notice
                text={`${draft.missingCount} akşam tamamlanamadı. Fiyat defterini doldurabilir veya bütçeni düzenleyebilirsin.`}
              />
            )}
            {!!draft.suggestions.length && (
              <Button
                label="Bütçeli menüyü ekle"
                onPress={() => {
                  dispatch({
                    type: 'addMeals',
                    values: draft.suggestions.map((m) => ({ ...m, id: makeId('meal') })),
                  });
                  router.push('/plan');
                }}
              />
            )}
          </>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Alışveriş harcaması ekle</Text>
        <Field
          label="Harcama tutarı (TL)"
          value={expense}
          onChangeText={setExpense}
          keyboardType="decimal-pad"
        />
        <Field label="Market veya açıklama" value={store} onChangeText={setStore} maxLength={100} />
        <Field
          label="Harcama tarihi (YYYY-AA-GG)"
          value={expenseDate}
          onChangeText={setExpenseDate}
          maxLength={10}
        />
        <Button
          label="Harcamayı kaydet"
          onPress={() => {
            const cents = parseMoney(expense);
            if (cents === null || !store.trim() || !z.iso.date().safeParse(expenseDate).success)
              return setNotice('Tutarı, açıklamayı ve tarihi kontrol et.');
            dispatch({
              type: 'tools',
              value: {
                expenses: [
                  {
                    id: makeId('expense'),
                    date: expenseDate,
                    cents,
                    store: store.trim(),
                    note: '',
                  },
                  ...tools.expenses,
                ],
              },
            });
            setExpense('');
            setStore('');
            setNotice('Harcama, girdiğin tarihin haftasına kaydedildi.');
          }}
        />
        {expenses.map((e) => (
          <View key={e.id} style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.h3}>
                {e.store} · {money(e.cents)}
              </Text>
              <Text style={s.muted}>{e.date}</Text>
            </View>
            <IconButton
              label={e.store + ' harcamasını kaldır'}
              icon="close"
              onPress={() =>
                dispatch({
                  type: 'tools',
                  value: { expenses: tools.expenses.filter((i) => i.id !== e.id) },
                })
              }
            />
          </View>
        ))}
      </View>
    </Page>
  );
}
