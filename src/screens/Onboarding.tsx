import { Text } from '../ui/Text';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { Budget, Diet, budgetLabels, dietLabels } from '../domain/model';
import { Button, Page, Stepper } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { RecipeImage } from '../ui/RecipeImage';
import { Wordmark } from '../ui/AppHeader';

export function Onboarding({ editing = false }: { editing?: boolean }) {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [people, setPeople] = useState(state.profile?.people ?? 2);
  const [diets, setDiets] = useState<Diet[]>(state.profile?.diets ?? []);
  const [budget, setBudget] = useState<Budget>(state.profile?.budget ?? 'balanced');
  const finish = () => {
    dispatch({ type: 'profile', value: { people, diets, budget } });
    if (editing) router.back();
  };
  return (
    <Page>
      <View style={{ width: '100%', maxWidth: 500, alignSelf: 'center', gap: 24, paddingTop: 8 }}>
        <View style={s.between}>
          <Wordmark />
          <Text style={s.muted}>{step + 1} / 3</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? colors.green : colors.line,
              }}
            />
          ))}
        </View>
        {step === 0 && (
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              height: 150,
              overflow: 'hidden',
              borderRadius: 20,
            }}
          >
            <RecipeImage id="menemen" style={{ width: '48.5%', height: 150 }} />
            <RecipeImage id="nohut" style={{ width: '48.5%', height: 150 }} />
          </View>
        )}
        <View style={{ gap: 10, marginTop: step === 0 ? 0 : 24 }}>
          <Text style={s.title}>
            {['Kaç kişilik bir sofra?', 'Nasıl besleniyorsun?', 'Bütçen nasıl olsun?'][step]}
          </Text>
          <Text style={s.muted}>
            {
              [
                'Malzemeleri sofrandaki kişi sayısına göre hesaplayalım.',
                'Birden fazla seçim yapabilir ya da tüm tariflerle devam edebilirsin.',
                'Tercihine uygun tarifleri öne çıkaralım.',
              ][step]
            }
          </Text>
        </View>
        {step === 0 && (
          <View style={[s.card, { backgroundColor: '#F0F4F5', borderWidth: 0 }]}>
            <Stepper value={people} onChange={setPeople} />
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: 10 }}>
            <Option
              label="Her şeyi yerim"
              selected={diets.length === 0}
              onPress={() => setDiets([])}
            />
            {(Object.keys(dietLabels) as Diet[]).map((d) => (
              <Option
                key={d}
                label={dietLabels[d]}
                selected={diets.includes(d)}
                onPress={() =>
                  setDiets((previous) =>
                    previous.includes(d) ? previous.filter((v) => v !== d) : [...previous, d],
                  )
                }
              />
            ))}
            <Text style={[s.muted, { fontSize: 12 }]}>
              Özel alerjin varsa ürün etiketlerini ayrıca kontrol et.
            </Text>
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: 10 }}>
            {(Object.keys(budgetLabels) as Budget[]).map((b) => (
              <Option
                key={b}
                label={budgetLabels[b]}
                description={
                  {
                    economic: 'Temel malzemeler, tanıdık lezzetler',
                    balanced: 'Çeşitlilik ve denge',
                    flexible: 'Daha geniş seçenekler',
                  }[b]
                }
                selected={budget === b}
                onPress={() => setBudget(b)}
              />
            ))}
            <Text style={[s.muted, { fontSize: 12 }]}>
              Bunlar göreceli tercihlerdir; gerçek market fiyatı değildir.
            </Text>
          </View>
        )}
        <Button
          label={step === 2 ? (editing ? 'Tercihleri kaydet' : 'Soframı oluşturalım') : 'Devam et'}
          onPress={() => (step < 2 ? setStep(step + 1) : finish())}
          icon="arrow-forward"
        />
        {step > 0 && <Button label="Geri" secondary onPress={() => setStep(step - 1)} />}
        <Text style={[s.muted, { fontSize: 11, textAlign: 'center' }]}>
          Yazgan · Geçici ürün adı / Hesap gerekmez.
        </Text>
        {!editing && (
          <View style={{ gap: 10 }}>
            <Button label="Hesabım / giriş yap" secondary onPress={() => router.push('/account')} />
            <Button
              label="Yedeğimden devam et"
              secondary
              icon="folder-open-outline"
              onPress={() => router.push('/backups')}
            />
          </View>
        )}
      </View>
    </Page>
  );
}
function Option({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.between,
        {
          minHeight: 62,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: selected ? colors.green : colors.line,
          backgroundColor: selected ? colors.lime : colors.surface,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.h3}>{label}</Text>
        {description && <Text style={[s.muted, { fontSize: 13 }]}>{description}</Text>}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? colors.green : colors.line}
      />
    </Pressable>
  );
}
