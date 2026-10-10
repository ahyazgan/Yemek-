import React from 'react';
import { router } from 'expo-router';
import { Button, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export default function NotFound() {
  return (
    <Page maxWidth={600}>
      <Text style={s.eyebrow}>SOFRA</Text>
      <Text style={s.title}>Bu sayfayı bulamadık</Text>
      <Text style={s.text}>
        Bağlantı eski veya eksik olabilir. Kayıtların korunuyor; ana sayfadan devam edebilirsin.
      </Text>
      <Button label="Soframa dön" onPress={() => router.replace('/')} />
    </Page>
  );
}
