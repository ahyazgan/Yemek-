import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { HouseholdPublication } from '../domain/householdPublication';
import type { SharedItem } from '../domain/household';
import { dateLabel } from '../domain/logic';
import { Button, Notice } from './components';
import { Text } from './Text';
import { colors, styles as s } from './theme';

const amount = (item: SharedItem) => `${item.quantity.toLocaleString('tr-TR')} ${item.unit}`;
export function HouseholdPublishPreview({
  value,
  stale,
  sourceChanged,
  busy,
  onKeepManual,
  onRefresh,
  onConfirm,
  onCancel,
}: {
  value: HouseholdPublication;
  stale: boolean;
  sourceChanged: boolean;
  busy: boolean;
  onKeepManual: (keep: boolean) => void;
  onRefresh: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [details, setDetails] = useState(false);
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>AKTARMADAN ÖNCE</Text>
      <Text style={s.h2}>Bu haftayı paylaşalım mı?</Text>
      <Text style={s.text}>
        {value.content.menu.length} öğün ve {value.content.items.length} ürün paylaşılacak. Evdeki
        miktarın düşüldüğü alışveriş miktarları kullanılır.
      </Text>
      <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
        {[
          `${value.added.length} yeni ürün`,
          `${value.changed.length} değişen ürün`,
          `${value.removed.length} çıkarılan ürün`,
        ].map((label) => (
          <View key={label} style={{ backgroundColor: colors.soft, borderRadius: 12, padding: 10 }}>
            <Text style={s.muted}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.muted}>
        {value.addedMeals.length} yeni, {value.changedMeals.length} değişen,{' '}
        {value.removedMeals.length} çıkarılan öğün.
      </Text>
      <Text style={s.text}>{value.preservedChecks} alındı işareti korunacak.</Text>
      {value.resetChecks > 0 && (
        <Notice
          text={`${value.resetChecks} üründe miktar veya birim değişti. Bu ürünler yeniden kontrol edilmek üzere alınmadı olarak gösterilecek.`}
        />
      )}
      {value.ambiguous > 0 && (
        <Notice text="Aynı adlı birden fazla ürün eşleştirilemedi. Bu satırlarda alındı işareti taşınmaz; ayrıntıları kontrol et." />
      )}
      {value.manual.length > 0 && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Ortak ek ürünleri koru"
          accessibilityState={{ checked: value.keepManual, disabled: busy || stale }}
          aria-checked={value.keepManual}
          disabled={busy || stale}
          onPress={() => onKeepManual(!value.keepManual)}
          style={[s.row, { minHeight: 50, gap: 10 }]}
        >
          <Ionicons
            name={value.keepManual ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.green}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.h3}>Ortak ek ürünleri koru</Text>
            <Text style={s.muted}>
              Ev halkının eklediği {value.manual.length} ürün
              {value.keepManual ? ' ve işaretleri kalacak.' : ' listeden çıkarılacak.'}
            </Text>
          </View>
        </Pressable>
      )}
      <Button
        label={details ? 'Değişiklikleri gizle' : 'Değişiklikleri göster'}
        secondary
        onPress={() => setDetails(!details)}
      />
      {details && (
        <View style={{ gap: 10 }}>
          {value.added.map((item) => (
            <Text key={`add-${item.id}`} style={s.text}>
              Eklenecek · {item.name} · {amount(item)}
              {item.checked ? ' · Alındı' : ''}
            </Text>
          ))}
          {value.changed.map(({ before, after }) => (
            <Text key={`change-${after.id}`} style={s.text}>
              Değişecek · {before.name} · {amount(before)} → {after.name} · {amount(after)}
            </Text>
          ))}
          {value.removed.map((item) => (
            <Text key={`remove-${item.id}`} style={s.error}>
              Çıkarılacak · {item.name} · {amount(item)}
              {item.checked ? ' · Alındı işaretliydi' : ''}
            </Text>
          ))}
          {value.keepManual &&
            value.manual.map((item) => (
              <Text key={`keep-${item.id}`} style={s.text}>
                Korunacak · {item.name} · {amount(item)}
                {item.checked ? ' · Alındı' : ''}
              </Text>
            ))}
          {value.addedMeals.map((meal) => (
            <Text key={`meal-add-${meal.date}-${meal.slot}`} style={s.text}>
              Yeni öğün · {dateLabel(meal.date)} · {meal.slot === 'lunch' ? 'Öğle' : 'Akşam'} ·{' '}
              {meal.title} · {meal.servings} kişilik
            </Text>
          ))}
          {value.changedMeals.map(({ before, after }) => (
            <Text key={`meal-change-${after.date}-${after.slot}`} style={s.text}>
              Değişen öğün · {dateLabel(after.date)} · {after.slot === 'lunch' ? 'Öğle' : 'Akşam'} ·{' '}
              {before.title} ({before.servings}) → {after.title} ({after.servings} kişi)
            </Text>
          ))}
          {value.removedMeals.map((meal) => (
            <Text key={`meal-remove-${meal.date}-${meal.slot}`} style={s.error}>
              Çıkarılan öğün · {dateLabel(meal.date)} · {meal.slot === 'lunch' ? 'Öğle' : 'Akşam'} ·{' '}
              {meal.title}
            </Text>
          ))}
          {value.unchanged.length > 0 && (
            <Text style={s.muted}>
              {value.unchanged.length} ürünün adı ve miktarı aynı kalacak.
            </Text>
          )}
        </View>
      )}
      <Text style={s.muted}>
        Tarif fotoğrafın, özel notların ve bütçen paylaşılmaz. Sonraki kişisel değişiklikleri
        yeniden aktarman gerekir.
      </Text>
      {!!value.issue && (
        <Text accessibilityRole="alert" style={s.error}>
          {value.issue}
        </Text>
      )}
      {stale && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {sourceChanged
              ? 'Kişisel menün veya alışverişin bu sırada değişti. Karşılaştırmayı yenile.'
              : 'Ortak liste bu sırada değişti. Güncel listeyle karşılaştırmayı yenile.'}
          </Text>
          <Button label="Karşılaştırmayı yenile" secondary disabled={busy} onPress={onRefresh} />
        </>
      )}
      <Button
        label="Bu haftanın ortak kaydını değiştir"
        disabled={busy || stale || !!value.issue}
        onPress={onConfirm}
      />
      <Button label="Aktarımdan vazgeç" secondary disabled={busy} onPress={onCancel} />
    </View>
  );
}
