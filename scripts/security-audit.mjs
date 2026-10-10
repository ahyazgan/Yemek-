import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySecurityPatches } from './security-patches.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mitigated = new Map([
  ['GHSA-vfj7-8cjw-p6xm', { name: 'braces', version: '3.0.3' }],
  ['GHSA-86w9-cpqp-85rv', { name: 'node-forge', version: '1.4.0' }],
]);
// A short review deadline prevents a temporary backport becoming a silent exception.
const reviewBy = Date.parse('2026-10-25T00:00:00Z');
export function auditFindings(audit, strict = false, now = Date.now()) {
  if (audit.error || !audit.metadata?.vulnerabilities || !audit.vulnerabilities)
    throw new Error('Security audit unavailable');
  const unique = new Map();
  for (const value of Object.values(audit.vulnerabilities)) {
    for (const advisory of value.via || []) {
      if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity))
        continue;
      unique.set(advisory.url, { ...advisory, package: value.name });
    }
  }
  const blocked = [];
  for (const advisory of unique.values()) {
    const id = advisory.url?.split('/').at(-1);
    const reviewed = mitigated.get(id);
    if (
      strict ||
      now >= reviewBy ||
      advisory.severity !== 'high' ||
      !reviewed ||
      reviewed.name !== advisory.package
    )
      blocked.push(advisory.url || advisory.package);
  }
  if (
    (audit.metadata.vulnerabilities.high || audit.metadata.vulnerabilities.critical) &&
    !unique.size
  )
    blocked.push('Unresolved transitive advisory');
  return { blocked, advisories: unique.size, counts: audit.metadata.vulnerabilities };
}
export function runSecurityAudit(strict = false) {
  verifySecurityPatches();
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  for (const expected of mitigated.values()) {
    for (const [path, value] of Object.entries(lock.packages)) {
      if (
        (path === `node_modules/${expected.name}` ||
          path.endsWith(`/node_modules/${expected.name}`)) &&
        value.version !== expected.version
      )
        throw new Error('Review changed dependency before audit exception');
    }
  }
  const result = spawnSync('npm', ['audit', '--package-lock-only', '--ignore-scripts', '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 60000,
  });
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('Dependency advisory service unavailable');
  const findings = auditFindings(JSON.parse(result.stdout), strict);
  console.log(JSON.stringify(findings, null, 2));
  if (findings.blocked.length)
    throw new Error('Security gate blocked: review open high/critical advisories');
  if (findings.advisories)
    console.log(
      'Known advisories remain in npm. Verified local mitigations permit demo/CI only until 2026-10-25; production remains blocked.',
    );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runSecurityAudit(process.argv.includes('--strict'));
