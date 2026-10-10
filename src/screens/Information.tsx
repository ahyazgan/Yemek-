import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { Text } from '../ui/Text';
import { Button, Notice, Page } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { serviceCatalog } from '../integrations/services';
import { ConnectionStatus } from '../ui/ConnectionStatus';

export function Information({ kind }: { kind: 'help' | 'privacy' | 'services' }) {
  const auth = useAuth();
  const questions = [
    [
      'Nasıl kullanırım?',
      'Tercihlerini seç, Haftamı hazırla ile menünü oluştur, istemediğin yemeği değiştir. Listem ekranında evde olanı çıkar ve kalanları işaretle.',
    ],
    [
      'Gerçek sipariş verebilir miyim?',
      'Sofra henüz market sepetine aktarım veya ödeme yapmaz. Market bağlantısı ilgili resmî siteyi açar; liste otomatik aktarılmaz. Bu nedenle uygulamada sipariş geçmişi oluşmaz.',
    ],
    [
      'Hesap şart mı?',
      'Hayır. Misafir modu cihazda çalışır. Demo hesap, hesap ekranlarını denemek içindir. Gerçek hesap ve tercihe bağlı bulut eşitleme Supabase bağlantısıyla açılır. Yedek dışa aktarma ve geri yükleme misafirde de kullanılabilir.',
    ],
    [
      'Listemi ailemle paylaşabilir miyim?',
      'Metin paylaşımı için Listeyi paylaş kullanılır. Ortak liste ekranında hane kurabilir, davet ve üye yetkilerini deneyebilirsin. Canlı ortak kullanım gerçek hesap ve Supabase hane bağlantısı gerektirir; yerel deneme başka cihazla eşitlenmez.',
    ],
    [
      'Gramajlar neden değişiyor?',
      'Porsiyon ve haftadaki öğün sayısına göre hesaplanır. Evdeki miktar toplamdan bir kez çıkarılır. Ek ürünler kendi birimleriyle ayrıca tutulur.',
    ],
    [
      'Destek nerede?',
      'Canlı destek kanalı henüz tanımlanmadı. Yayına çıkmadan Yazgan destek adresi bu ekrana bağlanacak.',
    ],
  ];
  return (
    <Page maxWidth={760}>
      <Text style={s.eyebrow}>YAZGAN · SOFRA</Text>
      <Text style={s.title}>
        {kind === 'help'
          ? 'Nasıl yardımcı olalım?'
          : kind === 'privacy'
            ? 'Gizlilik ve kullanım bilgisi'
            : 'Bağlantılar ve servisler'}
      </Text>
      {kind === 'help' &&
        questions.map(([q, a]) => (
          <View key={q} style={s.card}>
            <Text style={s.h3}>{q}</Text>
            <Text style={s.text}>{a}</Text>
          </View>
        ))}
      {kind === 'privacy' && (
        <>
          <Notice text="Önizleme bilgilendirmesi · Yayımlanacak gizlilik politikası ve kullanım koşulları henüz tamamlanmadı. Bu ekran hukuki sözleşme değildir." />
          <View style={s.card}>
            <Text style={s.h2}>Bu sürümde verilerin</Text>
            <Text style={s.text}>
              Misafir ve demo kayıtları cihazda saklanır. Demo şifreleri saklanmaz veya doğrulanmaz.
              Gerçek hesap modu açılırsa giriş bilgileri yapılandırılan Supabase projesine iletilir.
              Sofra verileri Şimdi eşitle düğmesiyle veya otomatik eşitlemeyi açarsan uygulama
              açıkken bu projeye gönderilir. Eşitlemeyi Hesabım bölümünden kapatabilirsin. Geri
              yükleme öncesindeki tek kopya da bu cihazda saklanır.
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Kontrol sende</Text>
            <Text style={s.text}>
              Hesabım bölümünden verilerini dışa aktarabilir ve hesabını silebilirsin. İzleme,
              reklam, ödeme, konum ve uzaktan bildirim servisleri bu sürümde etkin değil.
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Ortak hane</Text>
            <Text style={s.text}>
              Canlı haneye katılman ve bir haftayı paylaşman ayrı onay ister. Ortak menü ve liste
              Supabase projesinde hane üyelerine açılır; kişisel bulut yedeği anahtarı bu paylaşımı
              kapatmaz. Ortak kaydı artık görmek istemiyorsan haneden ayrılabilirsin. Yönetici
              hesabı silinirse, yöneticilik önceden devredilmediyse hane de silinir.
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Tarifler ve marka</Text>
            <Text style={s.text}>
              Sofra geçici ürün adıdır; çatı şirket Yazgan şirketidir. Tarifler örnek içeriktir,
              görseller temsilidir. Beslenme etiketleri ürün etiketi kontrolünün yerini tutmaz.
            </Text>
          </View>
        </>
      )}
      {kind === 'services' && (
        <>
          <Notice
            text={
              auth.mode === 'demo'
                ? 'Demo modu açık. Gerçek hesap ve bulut eşitlemesi için bağlantı kurulmalı.'
                : 'Gerçek hesap modu seçili. Her servisin kullanılabilmesi kendi kurulumuna ve bağlantı testine bağlıdır.'
            }
          />
          <ConnectionStatus />
          {serviceCatalog.map((service) => (
            <View key={service.id} style={s.card}>
              <Text style={s.h3}>{service.title}</Text>
              <Text style={[s.muted, { color: colors.green }]}>
                {service.id === 'auth' && auth.mode === 'supabase'
                  ? 'Yapılandırılmış mod'
                  : service.stage}
              </Text>
              <Text style={s.text}>{service.description}</Text>
            </View>
          ))}
        </>
      )}
      <Button label="Hesabıma git" secondary onPress={() => router.push('/account')} />
    </Page>
  );
}
