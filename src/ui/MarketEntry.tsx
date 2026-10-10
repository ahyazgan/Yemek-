import { Text } from './Text';
import React from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, styles as s } from './theme';

export function MarketEntry() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Market seç"
      onPress={() => router.push('/markets')}
      style={({ pressed }) => [
        s.card,
        {
          padding: 16,
          gap: 6,
          backgroundColor: colors.yellow,
          borderWidth: 0,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={s.between}>
        <View style={[s.row, { gap: 8, flex: 1 }]}>
          <Ionicons name="storefront-outline" size={23} color={colors.green} />
          <Text style={[s.h3, { flex: 1 }]}>Marketten sipariş</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.green} />
      </View>
      <Text style={[s.text, { fontSize: 13 }]}>Migros · Trendyol · CarrefourSA</Text>
      <Text style={[s.muted, { fontSize: 11, lineHeight: 16 }]}>
        Sitesinde devam et. Otomatik sepet aktarımı yok.
      </Text>
    </Pressable>
  );
}
