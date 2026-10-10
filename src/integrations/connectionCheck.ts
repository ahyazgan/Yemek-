import { authMode, getSupabase } from './supabase';
import { ensureNotAborted, withDeadline } from './deadline';

export type ConnectionCheck = {
  id: 'mode' | 'account' | 'backup';
  title: string;
  status: 'ok' | 'waiting' | 'error';
  detail: string;
};
const row = (
  id: ConnectionCheck['id'],
  title: string,
  status: ConnectionCheck['status'],
  detail: string,
): ConnectionCheck => ({ id, title, status, detail });

// Read-only, on explicit request. It never starts synchronization or reads a backup payload.
export async function checkAccountConnection(signal?: AbortSignal): Promise<ConnectionCheck[]> {
  if (authMode === 'demo')
    return [
      row(
        'mode',
        'Kullanım modu',
        'waiting',
        'Demo açık. Tariflerin ve listelerin bu cihazda saklanır.',
      ),
      row(
        'account',
        'Gerçek hesap',
        'waiting',
        'Supabase bağlantısı kurulunca gerçek giriş kontrol edilebilir.',
      ),
      row(
        'backup',
        'Bulut yedeği',
        'waiting',
        'Bulut bağlantısı bekleniyor. Dosyayla yedeklemeyi şimdi kullanabilirsin.',
      ),
    ];
  let db: ReturnType<typeof getSupabase>;
  try {
    db = getSupabase();
  } catch {
    return [
      row(
        'mode',
        'Kullanım modu',
        'error',
        'Gerçek hesap seçili, bağlantı bilgileri eksik veya geçersiz.',
      ),
      row('account', 'Gerçek hesap', 'waiting', 'Önce uygulamanın Supabase ayarları tamamlanmalı.'),
      row('backup', 'Bulut yedeği', 'waiting', 'Hesap bağlantısından sonra kontrol edilecek.'),
    ];
  }
  const result = [row('mode', 'Kullanım modu', 'ok', 'Gerçek hesap modu seçili.')];
  let owner: string;
  try {
    const verified = await withDeadline(
      async (requestSignal) => {
        const local = await db.auth.getSession();
        ensureNotAborted(requestSignal);
        if (local.error) throw local.error;
        if (!local.data.session) return null;
        const { data, error } = await db.auth.getUser();
        ensureNotAborted(requestSignal);
        if (error || !data.user || data.user.id !== local.data.session.user.id)
          throw new Error('Session changed');
        return data.user.id;
      },
      'Connection timeout',
      signal,
    );
    if (!verified)
      return [
        ...result,
        row(
          'account',
          'Gerçek hesap',
          'waiting',
          'Giriş yaptıktan sonra hesabını sunucuda doğrulayabiliriz.',
        ),
        row('backup', 'Bulut yedeği', 'waiting', 'Kontrol için gerçek hesabına giriş yap.'),
      ];
    owner = verified;
    result.push(row('account', 'Gerçek hesap', 'ok', 'Hesap oturumu sunucuda doğrulandı.'));
  } catch {
    if (signal) ensureNotAborted(signal);
    return [
      ...result,
      row(
        'account',
        'Gerçek hesap',
        'error',
        'Oturum doğrulanamadı. İnternetini kontrol et veya yeniden giriş yap.',
      ),
      row('backup', 'Bulut yedeği', 'waiting', 'Hesap doğrulanınca yeniden kontrol edilecek.'),
    ];
  }
  try {
    await withDeadline(
      async (requestSignal) => {
        const { error } = await db
          .from('app_snapshots')
          .select('owner_id,revision,updated_at', { head: true })
          .eq('owner_id', owner)
          .limit(0)
          .abortSignal(requestSignal);
        if (error) throw error;
        const current = await db.auth.getSession();
        ensureNotAborted(requestSignal);
        if (current.error || current.data.session?.user.id !== owner)
          throw new Error('Session changed');
      },
      'Connection timeout',
      signal,
    );
    result.push(
      row(
        'backup',
        'Bulut yedeği',
        'ok',
        'Yedek tablosuna okuma bağlantısı doğrulandı. Bu kontrol yedek oluşturmaz; eşitlemeyi Hesabım ekranından başlatabilirsin.',
      ),
    );
  } catch {
    if (signal) ensureNotAborted(signal);
    result.push(
      row(
        'backup',
        'Bulut yedeği',
        'error',
        'Yedek bağlantısı doğrulanamadı. İnternetini kontrol et; sorun sürerse veritabanı kurulumu ve hesap izinleri incelenmeli.',
      ),
    );
  }
  return result;
}
