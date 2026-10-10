import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { allIngredients, ingredientNameKey, ingredientUses } from '../domain/ingredients';
import { IngredientCreator } from '../ui/IngredientCreator';
import { Button, Empty, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';

export function IngredientsScreen() {
  const { state, dispatch, getState } = useApp();
  const [editing, setEditing] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  return (
    <Page maxWidth={720}>
      <Text style={s.eyebrow}>TARİF DEFTERİNİN MALZEMELERİ</Text>
      <Text style={s.title}>Kendi malzemelerim</Text>
      <Text style={s.muted}>
        Kataloğa kendi mutfağından malzeme ekle. Tariflerde, evdeki stokta ve alışveriş listesinde
        aynı malzeme birlikte hesaplanır.
      </Text>
      <IngredientCreator onCreated={(item) => setMessage(item.name + ' kullanıma hazır.')} />
      {state.customIngredients.length === 0 && (
        <Empty
          title="Mutfağından yeni bir lezzet"
          description="Katalogda bulamadığın malzemeleri hazırlık durumlarıyla ekleyebilirsin. Örneğin ceviz içi veya kuru nohut."
        />
      )}
      {state.customIngredients.map((item) => {
        const uses = ingredientUses(state, item.id);
        return (
          <View key={item.id} style={s.card}>
            <Text style={s.h2}>{item.name}</Text>
            <Text style={s.muted}>{item.category}</Text>
            {!!uses.length && <Text style={s.muted}>{uses.join(' · ')}</Text>}
            {editing === item.id ? (
              <>
                <Field
                  label="Malzemenin yeni adı"
                  value={name}
                  onChangeText={setName}
                  maxLength={100}
                />
                <Text style={s.muted}>
                  Tarif ve stok bağlantıları korunur. Kayıtlı alışveriş kopyaları eski adını saklar.
                  Malzemenin kendisini değiştiriyorsan yeni bir kayıt oluştur.
                </Text>
                <Button
                  label="Malzeme adını kaydet"
                  onPress={() => {
                    if (
                      name.trim().length < 2 ||
                      name.trim().length > 100 ||
                      allIngredients(getState()).some(
                        (i) =>
                          i.id !== item.id && ingredientNameKey(i.name) === ingredientNameKey(name),
                      )
                    ) {
                      setError('2–100 karakterlik, defterinde bulunmayan bir ad yaz.');
                      return;
                    }
                    dispatch({ type: 'ingredient', value: { ...item, name } });
                    setEditing('');
                    setError('');
                    setMessage('Malzeme adı güncellendi.');
                  }}
                />
                <Button label="Düzenlemeden vazgeç" secondary onPress={() => setEditing('')} />
              </>
            ) : (
              <Button
                label={item.name + ' adını düzenle'}
                secondary
                onPress={() => {
                  setEditing(item.id);
                  setName(item.name);
                  setError('');
                }}
              />
            )}
            {deleting === item.id ? (
              <>
                <Text style={s.muted}>Bu malzemeyi defterinden kaldırmak üzeresin.</Text>
                <Button
                  label="Malzemeyi silmeyi onayla"
                  disabled={uses.length > 0}
                  onPress={() => {
                    dispatch({ type: 'deleteIngredient', id: item.id });
                    setDeleting('');
                    setMessage('Kullanılmayan malzeme kaldırıldı.');
                  }}
                />
                <Button label="Silmekten vazgeç" secondary onPress={() => setDeleting('')} />
              </>
            ) : (
              <Button
                label={item.name + ' malzemesini sil'}
                secondary
                disabled={uses.length > 0}
                onPress={() => setDeleting(item.id)}
              />
            )}
          </View>
        );
      })}
      <Text style={s.muted}>
        Kullanılan malzemeyi silmeden önce bağlı tarifleri, kayıtlı listeleri, stoğu ve damak zevki
        tercihini düzenle. Hazır katalog malzemeleri bu ekrandan değişmez.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!message && <Notice text={message} />}
    </Page>
  );
}
