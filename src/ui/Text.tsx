import React from 'react';
import { Text as NativeText, TextProps, StyleSheet } from 'react-native';

// Static weights render consistently on Android, iOS and web, including Turkish glyphs.
export function Text({ style, ...props }: TextProps) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const numericWeight = weight === 'bold' ? 700 : Number(weight ?? 400);
  const fontFamily =
    numericWeight >= 700 ? 'OutfitBold' : numericWeight >= 500 ? 'OutfitSemiBold' : 'Outfit';
  return <NativeText {...props} style={[style, { fontFamily, fontWeight: 'normal' }]} />;
}
