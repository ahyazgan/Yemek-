import { z } from 'zod';
import { authMode, getSupabase } from './supabase';
import {
  boardSchema,
  boardWeek,
  createDemoHousehold,
  demoHome,
  demoInvite,
  DEMO_OWNER,
  householdHomeSchema,
  householdName,
  invitePreviewSchema,
  joinDemoHousehold,
  manageDemoHousehold,
  previewDemoInvite,
  writeDemoBoard,
  type HouseholdBoard,
  type HouseholdDemo,
  type HouseholdHome,
  type InvitePreview,
  type MemberAction,
} from '../domain/household';
export const householdEnabled =
  authMode === 'supabase' && process.env.EXPO_PUBLIC_HOUSEHOLD_ENABLED === 'true';
export type HouseholdPort = {
  load(week: string): Promise<HouseholdHome | null>;
  create(name: string, person: string): Promise<void>;
  invite(
    home: string,
    role: 'editor' | 'viewer',
  ): Promise<{ code: string; expiresAt: string; role: 'editor' | 'viewer' }>;
  preview(code: string): Promise<InvitePreview>;
  join(code: string, person: string): Promise<void>;
  manage(home: string, action: MemberAction, target?: string): Promise<void>;
  write(home: string, board: HouseholdBoard): Promise<void>;
  watch?(home: string, change: () => void): () => void;
};
export function demoHouseholdPort(
  actor: string,
  get: () => HouseholdDemo | null | undefined,
  set: (value: HouseholdDemo | null) => void,
): HouseholdPort {
  const current = () => {
    const value = get();
    if (!value) throw new Error('HOUSEHOLD_ACCESS');
    return value;
  };
  return {
    async load(week) {
      return demoHome(get(), actor, week);
    },
    async create(name, person) {
      if (get() || actor !== DEMO_OWNER) throw new Error('HOUSEHOLD_ALREADY');
      set(createDemoHousehold(name, person));
    },
    async invite(_, role) {
      // Deliberately recognizable demo code. Never accepted by the server.
      const next = demoInvite(
        current(),
        actor,
        role,
        'DEMO-' + Date.now().toString(36),
        Date.now(),
      );
      set(next);
      return next.invite!;
    },
    async preview(code) {
      return previewDemoInvite(get(), code, Date.now());
    },
    async join(code, person) {
      set(joinDemoHousehold(current(), code, person, Date.now()));
    },
    async manage(_, action, target) {
      set(manageDemoHousehold(current(), actor, action, target));
    },
    async write(_, board) {
      set(writeDemoBoard(current(), actor, board));
    },
  };
}
export function connectedHouseholdPort(actor: string): HouseholdPort {
  async function rpc(name: string, args: Record<string, unknown>) {
    if (!householdEnabled) throw new Error('Hane bağlantısı henüz kurulmadı.');
    const db = getSupabase();
    const { data: identity, error: failure } = await db.auth.getUser();
    if (failure || identity.user?.id !== actor) throw new Error('HOUSEHOLD_AUTH');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const { data, error } = await db
        .rpc(name, { ...args, p_actor: actor })
        .abortSignal(controller.signal);
      if (error) throw error;
      const { data: session } = await db.auth.getSession();
      if (session.session?.user.id !== actor) throw new Error('HOUSEHOLD_AUTH');
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    async load(week) {
      const result = await rpc('hh_get', { p_week: boardWeek.parse(week) });
      return result === null ? null : householdHomeSchema.parse(result);
    },
    async create(name, person) {
      await rpc('hh_create', {
        p_name: householdName.parse(name),
        p_person: householdName.parse(person),
      });
    },
    async invite(home, role) {
      return z
        .object({
          code: z.string().regex(/^[0-9a-f]{32}$/),
          role: z.enum(['editor', 'viewer']),
          expiresAt: z.iso.datetime({ offset: true }),
        })
        .parse(await rpc('hh_invite', { p_home: home, p_role: role }));
    },
    async preview(code) {
      return invitePreviewSchema.parse(
        await rpc('hh_preview', { p_code: code.trim().toLowerCase() }),
      );
    },
    async join(code, person) {
      await rpc('hh_join', {
        p_code: code.trim().toLowerCase(),
        p_person: householdName.parse(person),
      });
    },
    async manage(home, action, target) {
      await rpc('hh_manage', { p_home: home, p_action: action, p_target: target ?? null });
    },
    async write(home, board) {
      const valid = boardSchema.parse(board);
      await rpc('hh_write', {
        p_home: home,
        p_week: valid.week,
        p_expected: valid.revision,
        p_content: valid.content,
      });
    },
    watch(home, change) {
      const db = getSupabase();
      const channel = db
        .channel('household-' + home)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'shared_households',
            filter: 'id=eq.' + home,
          },
          change,
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') change();
        });
      return () => {
        void db.removeChannel(channel);
      };
    },
  };
}
export function householdMessage(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (message.includes('HOUSEHOLD_CONFLICT'))
    return 'Liste başka bir kişi tarafından değiştirildi. Güncel listeyi açtık; değişikliğini kontrol edip tekrar uygula.';
  if (message.includes('HOUSEHOLD_SOURCE_CHANGED'))
    return 'Kişisel menün veya alışverişin değişti. Karşılaştırmayı yenilemeden aktarım yapılmadı.';
  if (message.includes('HOUSEHOLD_INVITE'))
    return 'Davet geçersiz, kullanılmış, iptal edilmiş veya süresi dolmuş.';
  if (message.includes('HOUSEHOLD_ALREADY'))
    return 'Zaten bir hanedesin. Başka haneye katılmadan önce mevcut hanenden ayrıl.';
  if (message.includes('HOUSEHOLD_TRANSFER_FIRST'))
    return 'Ayrılmadan önce yöneticiliği başka bir üyeye devret.';
  if (message.includes('HOUSEHOLD_ACCESS'))
    return 'Bu işlem için hane yetkin yok. Üyeliğin değişmiş olabilir.';
  if (message.includes('HOUSEHOLD_AUTH'))
    return 'Oturum değişti veya sona erdi. Hesabına yeniden giriş yap.';
  if (message.includes('HOUSEHOLD_FULL')) return 'Hanede en fazla 12 kişi bulunabilir.';
  if (message.includes('HOUSEHOLD_LIMIT')) return '104 haftalık ortak kayıt sınırına ulaşıldı.';
  if (message.includes('HOUSEHOLD_INPUT'))
    return 'Üye, hafta veya ortak kayıt bilgisi geçersiz. Güncel haneyi kontrol et.';
  if (error instanceof z.ZodError) return 'Ad, miktar veya ortak kayıt biçimini kontrol et.';
  return 'İşlem doğrulanamadı. Bağlantıyı kontrol edip Yenile ile son durumu gör. Bir yazı sunucuya ulaşmış olabilir; otomatik tekrar gönderilmedi.';
}
