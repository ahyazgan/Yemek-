import { Text } from '../ui/Text';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppHeader } from '../ui/AppHeader';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../state/AppProvider';
import { Button, Page } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { accountStorageKey } from '../auth/contracts';
import { CloudSyncProvider } from '../state/CloudSyncProvider';
import { ReminderBridge } from '../ui/ReminderBridge';
import { ReminderNavigation } from '../ui/ReminderNavigation';
function Routes() {
  const { state, ready, loadError, saveError, retry, reset } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!ready)
    return (
      <SafeAreaView style={s.page}>
        {loadError ? (
          <Page>
            <Text style={s.title}>Kayıtlar okunamadı</Text>
            <Text style={s.text}>
              Cihazdaki kayıt bozuk, farklı bir sürümde veya depolamaya erişilemiyor. Mevcut verinin
              üzerine yazılmadı.
            </Text>
            <Button label="Tekrar dene" onPress={retry} />
            {confirmReset ? (
              <>
                <Text style={s.error}>Bu işlem tüm yerel kayıtlarını siler.</Text>
                <Button label="Yerel veriyi sil ve yeniden başla" onPress={() => void reset()} />
                <Button label="Vazgeç" secondary onPress={() => setConfirmReset(false)} />
              </>
            ) : (
              <Button
                label="Sıfırlama seçenekleri"
                secondary
                onPress={() => setConfirmReset(true)}
              />
            )}
          </Page>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator color={colors.green} />
            <Text style={[s.muted, { textAlign: 'center', marginTop: 12 }]}>
              Sofran hazırlanıyor…
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  return (
    <>
      {!!state.profile && <AppHeader />}
      {saveError && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.peach, padding: 12 }}>
          <Text style={s.error}>
            Değişiklikler cihazda kaydedilemedi. Uygulamayı kapatmadan tekrar dene.
          </Text>
          <Button label="Kaydetmeyi tekrar dene" onPress={retry} />
        </SafeAreaView>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!state.profile}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!state.profile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[id]" options={{ title: 'Tarif defteri' }} />
          <Stack.Screen name="recipe-notes/[id]" />
          <Stack.Screen name="recipe-photo/[id]" />
          <Stack.Screen name="inspiration/[id]" />
          <Stack.Screen name="choose-recipe" options={{ title: 'Yemek seç' }} />
          <Stack.Screen name="edit-recipe/[id]" options={{ title: 'Tarifi düzenle' }} />
          <Stack.Screen name="saved-list/[id]" options={{ title: 'Kayıtlı liste' }} />
          <Stack.Screen name="shopping-mode" options={{ title: 'Alışveriş modu' }} />
          <Stack.Screen name="preferences" options={{ title: 'Sofra tercihleri' }} />
          <Stack.Screen name="markets" options={{ title: 'Market seç' }} />
          <Stack.Screen name="basket-review" />
          <Stack.Screen name="prepare-week" options={{ title: 'Haftamı hazırla' }} />
          <Stack.Screen name="menu-assistant" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="batch-prep" />
          <Stack.Screen name="staples" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="collections/index" />
          <Stack.Screen name="collections/[id]" />
          <Stack.Screen name="pantry-recipes" />
          <Stack.Screen name="cook/[id]" />
          <Stack.Screen name="ready-to-cook" />
          <Stack.Screen name="new-recipe" />
          <Stack.Screen name="my-recipes" />
          <Stack.Screen name="taste" />
          <Stack.Screen name="equipment" />
          <Stack.Screen name="import-recipe" />
          <Stack.Screen name="ingredients" />
          <Stack.Screen name="household" />
          <Stack.Screen name="shared-household" />
          <Stack.Screen name="community" />
          <Stack.Screen name="history" />
          <Stack.Screen name="notifications" />
        </Stack.Protected>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="account" />
        <Stack.Screen name="backups" />
        <Stack.Screen name="help" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="services" />
      </Stack>
      <ReminderNavigation profileReady={!!state.profile} />
    </>
  );
}
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit: require('../../assets/fonts/Outfit-Regular.ttf'),
    OutfitSemiBold: require('../../assets/fonts/Outfit-SemiBold.ttf'),
    OutfitBold: require('../../assets/fonts/Outfit-Bold.ttf'),
  });
  if (!fontsLoaded && !fontError)
    return (
      <View style={[s.page, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ReminderBridge />
        <ScopedApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
function ScopedApp() {
  const auth = useAuth();
  if (!auth.ready)
    return (
      <View style={[s.page, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  const key = accountStorageKey(auth.mode, auth.user);
  return (
    <AppProvider key={key} storageKey={key}>
      <CloudSyncProvider>
        <StatusBar style="dark" />
        <Routes />
      </CloudSyncProvider>
    </AppProvider>
  );
}
