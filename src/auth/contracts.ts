import { z } from 'zod';
export const credentialsSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});
export const signUpSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(60) });
export const accountSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().max(60),
});
export type Account = z.infer<typeof accountSchema>;
export const DEMO_SESSION_KEY = '@yazgan/sofra/demo-session/v1';
export function parseAuthEmail(value: string) {
  const parsed = accountSchema.shape.email.safeParse(value.trim().toLowerCase());
  if (!parsed.success) throw new Error('Sofra:Geçerli bir e-posta gir.');
  return parsed.data;
}
export function accountStorageKey(mode: string, account: Account | null) {
  return account ? '@yazgan/sofra/' + mode + '/' + account.id + '/v1' : '@yazgan/sofra/offline/v1';
}
export function authMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'invalid_credentials') return 'E-posta veya şifre doğru değil.';
  if (code === 'email_not_confirmed') return 'Önce e-postandaki doğrulama bağlantısını aç.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  if (code === 'email_address_not_authorized' || code === 'email_provider_disabled')
    return 'E-posta gönderimi henüz kullanıma hazır değil. Şimdilik misafir olarak devam edebilirsin.';
  if (code === 'signup_disabled')
    return 'Yeni hesap oluşturma şu anda kapalı. Misafir olarak devam edebilirsin.';
  if (['otp_expired', 'flow_state_expired', 'flow_state_not_found'].includes(code))
    return 'Bağlantının süresi dolmuş veya daha önce kullanılmış. Yeni bir bağlantı iste.';
  if (code === 'bad_code_verifier' || code === 'pkce_code_verifier_not_found')
    return 'Bağlantı bu cihazda doğrulanamadı. Yeni bir bağlantı iste ve işlemi başlattığın uygulamada veya tarayıcıda aç.';
  if (code === 'weak_password')
    return 'Bu şifre yeterince güçlü değil. Daha uzun ve farklı bir şifre seç.';
  if (code === 'same_password') return 'Yeni şifren önceki şifrenden farklı olmalı.';
  if (code === 'request_timeout')
    return 'Yanıt gecikti. Gelen kutunu kontrol et; gerekirse biraz sonra tekrar dene.';
  return error instanceof Error && error.message.startsWith('Sofra:')
    ? error.message.slice(6)
    : 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
}
