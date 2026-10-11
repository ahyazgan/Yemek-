import { loadEnvFile } from 'node:process';
import assert from 'node:assert/strict';

// Public endpoints and anonymous access denials only. Never creates users or sends emails.
loadEnvFile('.env.local');
// This acceptance script targets the provisioned yemek project and catalog.
// Environment input cannot choose a different host for requests carrying a key.
const url = 'https://ndwkiuopnefwreucbyku.supabase.co';
assert.equal(process.env.EXPO_PUBLIC_SUPABASE_URL, url, 'Unexpected backend project');
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, 'Missing public backend configuration');
assert.equal(new URL(url).protocol, 'https:');
const checks = [];
async function check(name, path, validate, options = {}) {
  const response = await fetch(url + path, {
    ...options,
    headers: { apikey: key, ...options.headers },
    signal: AbortSignal.timeout(12000),
  });
  await validate(response);
  checks.push({ name, status: 'passed', http: response.status });
}
await check('Public recipe catalog', '/rest/v1/recipes?select=id&published=eq.true', async (r) => {
  assert.equal(r.status, 200);
  assert.equal((await r.json()).length, 26);
});
await check('Public ingredient catalog', '/rest/v1/ingredients?select=id', async (r) => {
  assert.equal(r.status, 200);
  assert.equal((await r.json()).length, 43);
});
await check('Email provider available; confirmation required', '/auth/v1/settings', async (r) => {
  assert.equal(r.status, 200);
  const settings = await r.json();
  assert.equal(settings.external.email, true);
  assert.equal(settings.mailer_autoconfirm, false);
});
await check(
  'Anonymous personal backups are inaccessible',
  '/rest/v1/app_snapshots?select=owner_id',
  async (r) => {
    if (r.status === 200) assert.deepEqual(await r.json(), []);
    else assert.ok([401, 403].includes(r.status));
  },
);
await check(
  'Internal relationship helper cannot be called anonymously',
  '/rest/v1/rpc/community_blocked',
  async (r) => {
    assert.ok([401, 403, 404].includes(r.status));
  },
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      a: '11111111-1111-4111-8111-111111111111',
      b: '22222222-2222-4222-8222-222222222222',
    }),
  },
);
await check(
  'Account deletion requires authentication',
  '/functions/v1/delete-account',
  async (r) => {
    assert.equal(r.status, 401);
  },
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"confirmation":"DELETE"}',
  },
);
await check(
  'Account deletion rejects an invalid token',
  '/functions/v1/delete-account',
  async (r) => {
    assert.equal(r.status, 401);
  },
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid-test-token' },
    body: '{"confirmation":"DELETE"}',
  },
);
console.log(
  JSON.stringify(
    {
      host: new URL(url).host,
      at: new Date().toISOString(),
      checks,
      limitation:
        'No real-user login, email delivery, authenticated deletion or device acceptance is claimed.',
    },
    null,
    2,
  ),
);
