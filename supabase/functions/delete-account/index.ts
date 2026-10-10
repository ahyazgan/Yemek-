// Runs in Supabase Edge Functions (Deno), never in the mobile bundle.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createDeleteHandler } from './handler.ts';
import { verifiedSessionId } from '../_shared/requestSafety.ts';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
Deno.serve(
  createDeleteHandler({
    async verify(token) {
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) return null;
      const session = verifiedSessionId(token);
      if (!session) return null;
      const active = await db.rpc('server_session_active', {
        expected_owner: data.user.id,
        expected_session: session,
      });
      return !active.error && active.data === true ? data.user.id : null;
    },
    async revoke(token) {
      const { error } = await db.auth.admin.signOut(token, 'global');
      if (error) throw error;
    },
    async remove(userId) {
      // This version owns no Storage objects or OAuth refresh tokens. Add their
      // cleanup / provider revocation before enabling uploads or Apple OAuth.
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  }),
);
