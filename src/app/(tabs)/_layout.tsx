import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, styles as s } from '../../ui/theme';
const icons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  index: 'restaurant-outline',
  plan: 'calendar-outline',
  list: 'bag-outline',
  kitchen: 'leaf-outline',
};
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={['left', 'right']} style={s.page}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            display: width >= 760 ? 'none' : 'flex',
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            height: 68 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 10),
          },
          tabBarLabelStyle: { fontFamily: 'OutfitSemiBold', fontSize: 12, lineHeight: 16 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={icons[route.name]} color={color} size={size} />
          ),
        })}
      >
        <Tabs.Screen name="index" options={{ title: 'Tarifler' }} />
        <Tabs.Screen name="plan" options={{ title: 'Menüm' }} />
        <Tabs.Screen name="list" options={{ title: 'Listem' }} />
        <Tabs.Screen name="kitchen" options={{ title: 'Mutfağım', href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
