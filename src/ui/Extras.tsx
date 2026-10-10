import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { ExtraItem } from '../domain/model';
import { makeId } from '../domain/state';
import { extraSchema } from '../storage/schema';
import { Button, Chip, Field, IconButton } from './components';
import { Text } from './Text';
import { colors, styles as s } from './theme';
export function Extras({
  items,
  onToggle,
  onRemove,
  editing = false,
}: {
  items: ExtraItem[];
  onToggle: (item: ExtraItem) => void;
  onRemove?: (id: string) => void;
  editing?: boolean;
}) {
  const { dispatch, week } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<ExtraItem['unit']>('adet');
  const [error, setError] = useState('');
  if (!editing && !items.length) return null;
  return (
    <View style={s.card}>
      <Text style={s.h2}>Ek alışveriş ürünlerim</Text>
      <Text style={s.muted}>
        Kahve, meyve, deterjan… Tarif dışındaki ihtiyaçların. Bunlar gramajlı tarif malzemeleriyle
        birleştirilmez.
      </Text>
      {items.map((item) => (
        <View key={item.id} style={s.between}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={item.name + ', ' + item.quantity + ' ' + item.unit}
            accessibilityState={{ checked: item.checked }}
            aria-checked={item.checked}
            onPress={() => onToggle(item)}
            style={[s.row, { flex: 1, minHeight: 48 }]}
          >
            <Ionicons
              name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={colors.green}
            />
            <Text
              style={[
                s.text,
                { flex: 1, textDecorationLine: item.checked ? 'line-through' : 'none' },
              ]}
            >
              {item.name} · {item.quantity} {item.unit}
            </Text>
          </Pressable>
          {onRemove && (
            <IconButton
              label={item.name + ' ek ürününü çıkar'}
              icon="close"
              onPress={() => onRemove(item.id)}
            />
          )}
        </View>
      ))}
      {editing && (
        <Button
          label={open ? 'Ek ürün formunu kapat' : 'Ek ürün ekle'}
          secondary
          icon="add"
          onPress={() => setOpen(!open)}
        />
      )}
      {editing && open && (
        <>
          <Field label="Ek ürün adı" value={name} onChangeText={setName} maxLength={100} />
          <Field
            label="Ek ürün miktarı"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['adet', 'paket', 'g', 'ml'] as const).map((u) => (
              <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
            ))}
          </View>
          {!!error && <Text style={s.error}>{error}</Text>}
          <Button
            label="Ek ürünü kaydet"
            onPress={() => {
              const result = extraSchema.safeParse({
                id: makeId('extra'),
                name,
                week,
                quantity: Number(quantity.replace(',', '.')),
                unit,
                checked: false,
              });
              if (!result.success) {
                setError('Ürün adı ve sıfırdan büyük, en fazla 1.000.000 miktar gir.');
                return;
              }
              dispatch({ type: 'extra', value: result.data });
              setName('');
              setQuantity('1');
              setError('');
              setOpen(false);
            }}
          />
        </>
      )}
    </View>
  );
}
