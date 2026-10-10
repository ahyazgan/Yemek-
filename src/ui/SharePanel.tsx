import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Button, Field } from './components';
import { Text } from './Text';
import { styles as s } from './theme';
import { printText } from '../integrations/print';
export function SharePanel({
  title,
  text,
  label = 'Listeyi paylaş',
}: {
  title: string;
  text: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  return (
    <View style={{ gap: 10 }}>
      <Button label={label} secondary icon="share-outline" onPress={() => setOpen(!open)} />
      {open && (
        <View style={s.card}>
          <Text style={s.h3}>{title}</Text>
          <Text style={s.muted}>
            İçeriği kontrol edip kopyalayabilir veya telefonunun paylaşım menüsünü açabilirsin.
          </Text>
          <Field
            label="Paylaşılacak metin"
            value={text}
            editable={false}
            multiline
            selectTextOnFocus
            style={[s.input, { minHeight: 170, maxHeight: 300 }]}
          />
          {Platform.OS !== 'web' && (
            <Button
              label="Paylaşım menüsünü aç"
              onPress={() =>
                void Share.share({ title, message: text }).catch(() =>
                  setError('Paylaşım menüsü açılamadı. Metni kopyalayabilirsin.'),
                )
              }
            />
          )}
          <Button label="Yazdır / PDF olarak kaydet" secondary icon="print-outline" onPress={() => void printText(title,text).catch(() => setError('Yazdırma açılamadı veya iptal edildi. Metni kopyalayabilirsin.'))} />
          {!!error && <Text style={s.error}>{error}</Text>}
        </View>
      )}
    </View>
  );
}
