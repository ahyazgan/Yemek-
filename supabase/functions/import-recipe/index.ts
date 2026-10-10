import { createClient } from 'npm:@supabase/supabase-js@2';
import { createImportHandler } from './handler.ts';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
Deno.serve(
  createImportHandler({
    async verify(token) {
      const { data, error } = await db.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    async consume(userId) {
      const { data, error } = await db.rpc('consume_recipe_import', { p_user_id: userId });
      if (error) throw error;
      return data === true;
    },
    fetch,
    // Only owned/trusted public origins. Keep network egress restrictions in production.
    allowedOrigins: (Deno.env.get('RECIPE_IMPORT_ORIGINS') ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  }),
);
