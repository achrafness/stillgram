import { SafeAreaView } from 'react-native-safe-area-context';

import { InstagramWebView } from '@/components/instagram-web-view';
import { InstagramHomeUrl } from '@/constants/instagram';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <InstagramWebView url={InstagramHomeUrl} />
    </SafeAreaView>
  );
}
