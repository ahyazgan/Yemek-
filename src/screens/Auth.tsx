import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { authMessage, credentialsSchema, signUpSchema } from '../auth/contracts';
import { Text } from '../ui/Text';
import { Wordmark } from '../ui/AppHeader';
import { Button, Field, Notice, Page } from '../ui/components';
import { styles as s } from '../ui/theme';
import { useApp } from '../state/AppProvider';
import { socialEnabled } from '../integrations/social';
import { readAuthLink } from '../auth/emailRequests';

export function AuthScreen({
  kind,
}: {
  kind: 'sign-in' | 'sign-up' | 'forgot' | 'reset' | 'callback' | 'resend';
}) {
  const auth = useAuth();
  const { state } = useApp();
  const { code, failed: linkError } = readAuthLink(useLocalSearchParams());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [resent, setResent] = useState(false);
  const [linkResult, setLinkResult] = useState({ code: '', ready: false, error: '' });
  const { callback } = auth;
  const hasCode = !!code && !linkError && (kind === 'callback' || kind === 'reset');
  const exchanging = hasCode && linkResult.code !== code;
  const busy = pending || exchanging;
  const linkReady =
    !linkError &&
    (hasCode
      ? linkResult.code === code && linkResult.ready
      : kind === 'reset' && !!(auth.recovery || auth.user));
  const callbackError = hasCode && linkResult.code === code ? linkResult.error : '';
  const [now, setNow] = useState(() => Date.now());
  const retrySeconds = Math.min(60, Math.max(0, Math.ceil((auth.emailRetryAt - now) / 1000)));
  const emailAction = kind === 'sign-up' || kind === 'forgot' || kind === 'resend';
  useEffect(() => {
    if (auth.emailRetryAt <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= auth.emailRetryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [auth.emailRetryAt]);
  useEffect(() => {
    if (!hasCode) return;
    let active = true;
    callback(code)
      .then(() => {
        if (active) setLinkResult({ code, ready: true, error: '' });
      })
      .catch((e) => {
        if (active) setLinkResult({ code, ready: false, error: authMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [callback, code, hasCode]);
  const submit = async () => {
    if (busy || inFlight.current || (emailAction && retrySeconds > 0)) return;
    setError('');
    const credentials = { email: email.trim(), password };
    if (kind === 'sign-up' && !signUpSchema.safeParse({ ...credentials, name }).success) {
      setError('Adın en az 2 karakter, e-posta geçerli, şifre en az 8 karakter olmalı.');
      return;
    }
    if (kind === 'sign-in' && !credentialsSchema.safeParse(credentials).success) {
      setError('Geçerli bir e-posta ve en az 8 karakterlik şifre gir.');
      return;
    }
    if ((kind === 'sign-up' || kind === 'reset') && password !== again) {
      setError('Şifreler aynı olmalı.');
      return;
    }
    if (kind === 'reset' && !credentialsSchema.shape.password.safeParse(password).success) {
      setError('Şifren 8–128 karakter olmalı.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      if (kind === 'sign-in') {
        await auth.signIn(email, password);
        router.replace('/account');
      }
      if (kind === 'sign-up') {
        const signedIn = await auth.signUp(name, email, password);
        if (signedIn) router.replace('/account');
        else {
          setDone(true);
          setPassword('');
          setAgain('');
        }
      }
      if (kind === 'forgot') {
        await auth.requestReset(email);
        setDone(true);
      }
      if (kind === 'resend') {
        await auth.resendConfirmation(email);
        setDone(true);
      }
      if (kind === 'reset') {
        await auth.updatePassword(password);
        setPassword('');
        setAgain('');
        setDone(true);
      }
    } catch (e) {
      setError(authMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const sendAgain = async () => {
    if (busy || inFlight.current || retrySeconds > 0) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setResent(false);
    try {
      if (kind === 'forgot') await auth.requestReset(email);
      else await auth.resendConfirmation(email);
      setResent(true);
    } catch (e) {
      setError(authMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const title = {
    'sign-in': 'Sofrana hoş geldin',
    'sign-up': 'Birlikte başlayalım',
    forgot: 'Şifreni mi unuttun?',
    reset: 'Yeni şifren',
    callback: 'E-postanı doğrula',
    resend: 'Doğrulama bağlantın',
  }[kind];
  return (
    <Page maxWidth={540}>
      {!state.profile && <Wordmark />}
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>Yemeklerin, listen ve mutfağın bir arada.</Text>
      {auth.mode === 'demo' && (
        <Notice text="Demo hesap · Şifre kontrol edilmez veya saklanmaz; e-posta gönderilmez. Örnek bilgiler kullan. Bu cihazda tek demo hesabı vardır." />
      )}
      {!!auth.error && <Text style={s.error}>{auth.error}</Text>}
      {!!(error || callbackError) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error || callbackError}
        </Text>
      )}
      {!!linkError && (
        <Text accessibilityRole="alert" style={s.error}>
          Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.
        </Text>
      )}
      {kind === 'reset' && !linkReady && !busy && (
        <Button
          label="Yeni şifre yenileme bağlantısı iste"
          secondary
          onPress={() => router.replace('/forgot-password')}
        />
      )}
      {done || (kind === 'callback' && linkReady) ? (
        <View style={s.card}>
          <Text style={s.h2}>
            {kind === 'sign-up' || kind === 'resend'
              ? 'Doğrulama adımı'
              : kind === 'forgot'
                ? 'Bağlantı adımı hazır'
                : kind === 'callback'
                  ? 'E-posta doğrulandı'
                  : 'Şifre adımı tamamlandı'}
          </Text>
          <Text style={s.text}>
            {auth.mode === 'demo'
              ? 'Bu bir ekran önizlemesidir. Gerçek e-posta veya şifre değişikliği yapılmadı.'
              : kind === 'sign-up' || kind === 'resend'
                ? 'Kaydın uygunsa e-postana gelen bağlantıyla hesabını doğrulayabilirsin.'
                : kind === 'forgot'
                  ? 'Bu adres için uygun bir hesap varsa yenileme bağlantısı gönderilir. Gelen kutunu kontrol et.'
                  : 'Hesabına devam edebilirsin.'}
          </Text>
          {emailAction && (
            <>
              <Text style={s.h3}>{email.trim()}</Text>
              <Text style={s.muted}>
                Gelen kutunu ve istenmeyen posta klasörünü kontrol et. En son istediğin bağlantıyı,
                işlemi başlattığın uygulamada veya tarayıcıda aç.
              </Text>
              {resent && (
                <Text accessibilityLiveRegion="polite" style={s.muted}>
                  {auth.mode === 'demo'
                    ? 'Demo isteği tamamlandı; e-posta gönderilmedi.'
                    : 'İstek alındı. Bu adres için işlem uygunsa yeni bağlantı gönderilir.'}
                </Text>
              )}
              <Button
                label={
                  busy
                    ? 'İşleniyor…'
                    : retrySeconds > 0
                      ? `Tekrar göndermek için ${retrySeconds} sn bekle`
                      : 'Bağlantıyı tekrar iste'
                }
                disabled={busy || retrySeconds > 0}
                onPress={() => void sendAgain()}
              />
              <Button
                label="E-posta adresini düzelt"
                secondary
                disabled={busy}
                onPress={() => {
                  setDone(false);
                  setResent(false);
                  setError('');
                }}
              />
              {auth.mode !== 'demo' && (
                <Button
                  label="Giriş ekranına dön"
                  secondary
                  onPress={() => router.replace('/sign-in')}
                />
              )}
            </>
          )}
          {auth.mode === 'demo' && kind === 'sign-up' && (
            <Button
              label="Demo doğrulamasını tamamla"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void auth
                  .confirmDemo(name, email.trim())
                  .then(() => router.replace('/account'))
                  .catch((e) => {
                    setError(authMessage(e));
                    setBusy(false);
                  });
              }}
            />
          )}
          {auth.mode === 'demo' && kind === 'forgot' && (
            <Button
              label="Demo şifre yenileme ekranını aç"
              onPress={() => router.push('/reset-password')}
            />
          )}
          <Button label="Hesabıma git" secondary onPress={() => router.replace('/account')} />
        </View>
      ) : kind === 'callback' ? (
        <View style={s.card}>
          <Text style={s.muted}>
            {busy
              ? 'Bağlantı doğrulanıyor…'
              : 'Yeni bir bağlantı isteyebilir veya doğruladıysan hesabına giriş yapabilirsin.'}
          </Text>
          <Button
            label="Yeni doğrulama bağlantısı iste"
            disabled={busy}
            onPress={() => router.replace('/verify-email')}
          />
          <Button label="Giriş ekranına dön" secondary onPress={() => router.replace('/sign-in')} />
        </View>
      ) : kind === 'reset' && !linkReady ? (
        <Text style={s.muted}>
          {busy
            ? 'Bağlantı doğrulanıyor…'
            : 'Şifreni değiştirmek için geçerli bir yenileme bağlantısı aç.'}
        </Text>
      ) : (
        <View style={s.card}>
          {kind === 'sign-up' && (
            <Field
              label="Adın"
              value={name}
              onChangeText={setName}
              autoComplete="given-name"
              maxLength={60}
            />
          )}
          {kind !== 'reset' && (
            <Field
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              maxLength={254}
            />
          )}
          {kind !== 'forgot' && kind !== 'resend' && (
            <>
              <Field
                label={kind === 'reset' ? 'Yeni şifre' : 'Şifre'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoComplete={kind === 'sign-in' ? 'current-password' : 'new-password'}
                maxLength={128}
              />
              {(kind === 'sign-up' || kind === 'reset') && (
                <Field
                  label="Şifre tekrar"
                  value={again}
                  onChangeText={setAgain}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  maxLength={128}
                />
              )}
              <Button
                label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                secondary
                onPress={() => setVisible(!visible)}
              />
            </>
          )}
          {emailAction && retrySeconds > 0 && (
            <Text style={s.muted}>Yeni bağlantı için {retrySeconds} sn bekle.</Text>
          )}
          {kind === 'resend' && (
            <Text style={s.muted}>
              Hesap oluştururken kullandığın e-posta adresini yaz. Henüz doğrulanmamış bir kayıt
              varsa bağlantı gönderilir.
            </Text>
          )}
          <Button
            label={
              busy
                ? 'İşleniyor…'
                : {
                    'sign-in': 'Giriş yap',
                    'sign-up': 'Hesap oluştur',
                    forgot: 'Yenileme bağlantısı iste',
                    reset: 'Yeni şifreyi kaydet',
                    resend: 'Doğrulama bağlantısı iste',
                  }[kind]
            }
            disabled={busy || (emailAction && retrySeconds > 0) || (kind === 'reset' && !linkReady)}
            onPress={() => void submit()}
          />
          {kind === 'sign-in' && (
            <>
              <Button
                label="Şifremi unuttum"
                secondary
                onPress={() => router.push('/forgot-password')}
              />
              <Button
                label="Yeni hesap oluştur"
                secondary
                onPress={() => router.replace('/sign-up')}
              />
              <Button
                label="Doğrulama e-postası gelmedi"
                secondary
                onPress={() => router.push('/verify-email')}
              />
              {(['apple', 'google'] as const).map((provider) => (
                <Button
                  key={provider}
                  label={
                    (provider === 'apple' ? 'Apple' : 'Google') +
                    ' ile giriş' +
                    (socialEnabled(provider) ? '' : ' · Kurulum bekliyor')
                  }
                  secondary
                  disabled={busy || !socialEnabled(provider)}
                  onPress={() => {
                    setBusy(true);
                    setError('');
                    auth
                      .signInSocial(provider)
                      .then((signedIn) => {
                        if (signedIn) router.replace('/account');
                      })
                      .catch((e) => setError(authMessage(e)))
                      .finally(() => setBusy(false));
                  }}
                />
              ))}
              {auth.mode === 'demo' && (
                <Button
                  label="Örnek bilgileri doldur"
                  secondary
                  onPress={() => {
                    setEmail('demo@sofra.test');
                    setPassword('SofraDemo2026!');
                  }}
                />
              )}
            </>
          )}
          {kind === 'sign-up' && (
            <Button
              label="Zaten hesabım var"
              secondary
              onPress={() => router.replace('/sign-in')}
            />
          )}
        </View>
      )}
      <Button label="Misafir olarak devam et" secondary onPress={() => router.replace('/')} />
      <Button
        label="Gizlilik ve kullanım bilgisi"
        secondary
        onPress={() => router.push('/privacy')}
      />
    </Page>
  );
}
