import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { Staple, applyStaples } from '../domain/companion';
import { makeId } from '../domain/state';
import { Button, Chip, Field, IconButton, Notice, Page, WeekPicker } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export function Staples() {
  const { state, dispatch, week } = useApp();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Staple['unit']>('adet');
  const [notice, setNotice] = useState('');
  const staples = state.experience.tools.staples;
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>HER ALIŞVERİŞTE</Text>
      <Text style={s.title}>Düzenli aldıklarım</Text>
      <Text style={s.muted}>
        Kahve, deterjan, meyve… Sık aldıklarını sakla, seçtiğin haftaya tek seferde ekle.
      </Text>
      <WeekPicker />
      {!!notice && <Notice text={notice} />}
      {!!staples.length && (
        <Button
          label="Düzenli ürünleri bu haftaya ekle"
          onPress={() => {
            const extras = applyStaples(state, week);
            extras.forEach((value) => dispatch({ type: 'extra', value }));
            setNotice(
              extras.length
                ? `${extras.length} ürün haftanın listesine eklendi.`
                : 'Bu ürünler zaten bu haftanın listesinde.',
            );
          }}
        />
      )}
      {staples.map((item) => (
        <View key={item.id} style={[s.card, s.between]}>
          <View style={{ flex: 1 }}>
            <Text style={s.h3}>{item.name}</Text>
            <Text style={s.muted}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <IconButton
            label={item.name + ' düzenli ürününü kaldır'}
            icon="close"
            onPress={() =>
              dispatch({
                type: 'tools',
                value: { staples: staples.filter((i) => i.id !== item.id) },
              })
            }
          />
        </View>
      ))}
      <View style={s.card}>
        <Field label="Düzenli ürün adı" value={name} onChangeText={setName} maxLength={100} />
        <Field
          label="Düzenli ürün miktarı"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={setQuantity}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(['adet', 'paket', 'g', 'ml'] as const).map((u) => (
            <Chip key={u} label={u} selected={u === unit} onPress={() => setUnit(u)} />
          ))}
        </View>
        <Button
          label="Düzenli ürünü kaydet"
          disabled={staples.length >= 100}
          onPress={() => {
            const n = Number(quantity.replace(',', '.'));
            if (!name.trim() || !Number.isFinite(n) || n <= 0 || n > 1000000)
              return setNotice('Ürün adını ve pozitif miktarı kontrol et.');
            if (
              staples.some(
                (i) => i.name.toLocaleLowerCase('tr') === name.trim().toLocaleLowerCase('tr'),
              )
            )
              return setNotice('Bu ürün zaten kayıtlı.');
            dispatch({
              type: 'tools',
              value: {
                staples: [
                  ...staples,
                  { id: makeId('staple'), name: name.trim(), quantity: n, unit },
                ],
              },
            });
            setName('');
            setNotice('Düzenli ürün kaydedildi.');
          }}
        />
      </View>
    </Page>
  );
}
