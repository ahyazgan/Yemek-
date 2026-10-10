import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { Text } from './Text';
import { colors, styles as s } from './theme';

export function Wordmark() {
  return (
    <Text
      style={{
        fontSize: 36,
        lineHeight: 42,
        fontWeight: '700',
        letterSpacing: -1.8,
        color: colors.accent,
      }}
    >
      sofra.
    </Text>
  );
}

export function AppHeader() {
  const { state } = useApp();
  const { width } = useWindowDimensions();
  const path = usePathname();
  const desktop = width >= 760;
  const main = ['/', '/plan', '/list'].includes(path);
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
      <View
        style={{
          height: 72,
          paddingHorizontal: desktop ? 32 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderColor: colors.line,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          {desktop ? (
            (
              [
                ['Tarifler', '/'],
                ['Menüm', '/plan'],
                ['Listem', '/list'],
              ] as const
            ).map(([label, href]) => (
              <Pressable
                key={href}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: path === href }}
                onPress={() => router.navigate(href)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text
                  style={{
                    color: path === href ? colors.green : colors.ink,
                    fontWeight: path === href ? '600' : '400',
                    fontSize: 16,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={main ? 'Marketleri gör' : 'Geri dön'}
              onPress={() =>
                main
                  ? router.push('/markets')
                  : router.canGoBack()
                    ? router.back()
                    : router.replace('/')
              }
              style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
            >
              <Ionicons
                name={main ? 'storefront-outline' : 'arrow-back'}
                size={24}
                color={colors.ink}
              />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sofra ana sayfa"
          onPress={() => router.navigate('/')}
        >
          <Wordmark />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mutfağım"
            onPress={() => router.navigate('/kitchen')}
            style={[s.row, { gap: 7, minHeight: 44, minWidth: 44, justifyContent: 'flex-end' }]}
          >
            <Ionicons name="person-outline" size={22} color={colors.ink} />
            {desktop && (
              <Text style={{ fontSize: 15, color: colors.ink }}>
                {state.profile?.people} kişilik sofram
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
