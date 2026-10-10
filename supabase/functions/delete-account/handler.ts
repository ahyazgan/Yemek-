export type DeleteDependencies = {
  verify: (token: string) => Promise<string | null>;
  revoke: (token: string) => Promise<void>;
  remove: (userId: string) => Promise<void>;
};
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers });
export function createDeleteHandler(dependencies: DeleteDependencies) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Method not allowed');
    try {
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) return reply(401, 'Authentication required');
      const token = authorization.slice(7);
      const userId = await dependencies.verify(token);
      if (!userId) return reply(401, 'Invalid session');
      const body = await request.json().catch(() => null);
      if (!body || body.confirmation !== 'DELETE') return reply(400, 'Confirmation required');
      await dependencies.revoke(token);
      await dependencies.remove(userId);
      return reply(200, 'Account deleted');
    } catch {
      return reply(500, 'Request failed');
    }
  };
}
