import { useKeepAwake } from 'expo-keep-awake';
export function CookAwake() {
  useKeepAwake('sofra-cooking', { suppressDeactivateWarnings: true });
  return null;
}
