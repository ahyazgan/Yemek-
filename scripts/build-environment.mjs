import { readFileSync } from 'node:fs';
const profiles = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')).build;

export function profileEnvironment(name, visited = new Set()) {
  if (!Object.hasOwn(profiles, name) || visited.has(name))
    throw new Error('Bilinmeyen veya döngüsel derleme profili.');
  const profile = profiles[name];
  const seen = new Set(visited).add(name);
  return {
    ...(profile.extends ? profileEnvironment(profile.extends, seen) : {}),
    ...profile.env,
  };
}

/** @param {Record<string, string | undefined>} [source] */
export function demoEnvironment(source = process.env) {
  // Do not carry public service configuration from a developer's machine into a demo.
  const clean = Object.fromEntries(
    Object.entries(source).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')),
  );
  return { ...clean, ...profileEnvironment('preview') };
}
