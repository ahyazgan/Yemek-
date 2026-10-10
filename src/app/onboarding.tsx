import { SafeAreaView } from 'react-native-safe-area-context';
import { Onboarding } from '../screens/Onboarding';
import { styles } from '../ui/theme';
export default function Welcome() {
  return (
    <SafeAreaView style={styles.page}>
      <Onboarding />
    </SafeAreaView>
  );
}
