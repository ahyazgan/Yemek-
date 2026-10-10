import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export function secretFindings(path, text) {
  const findings = [];
  if (
    (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) ||
    /\.(?:pem|p12|p8|jks|mobileprovision|key)$/i.test(path) ||
    /(^|\/)credentials\.json$/.test(path)
  )
    findings.push('private-file');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) findings.push('private-key');
  if (
    /\b(?:sb_secret_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/.test(
      text,
    )
  )
    findings.push('secret-token');
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}/g) || []) {
    try {
      if (
        JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role'
      )
        findings.push('service-role-jwt');
    } catch {
      /* not a JWT */
    }
  }
  return [...new Set(findings)];
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  const problems = [];
  for (const file of files) {
    const source = /\.(?:[cm]?js|[cm]?ts|tsx|jsx|json|md|ya?ml|sql|toml|txt|env|example)$/.test(
      file,
    )
      ? readFileSync(resolve(root, file), 'utf8')
      : '';
    for (const kind of secretFindings(file, source)) problems.push({ file, kind });
  }
  if (problems.length) {
    console.error(JSON.stringify(problems, null, 2));
    process.exitCode = 1;
  } else
    console.log(
      `Source secret check: ${files.length} files checked; no supported secret patterns found.`,
    );
}
