import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewNavigation } from 'react-native-webview';

import { buildInjectedScript, InstagramUserAgent } from '@/constants/instagram';

const injectedJavaScript = buildInjectedScript();

// Only the browsable surfaces are blocked: the Explore section and the reels TAB (exactly
// '/reels/'). A reel shared in a DM loads at '/reel/<code>/' or '/reels/<code>/' and must be
// allowed — the injected script locks it to that single reel.
const blockedPaths = [/^\/explore(\/|$)/, /^\/reels\/?$/];

type Props = {
  url: string;
};

export function InstagramWebView({ url }: Props) {
  const webViewRef = useRef<WebView>(null);

  function handleShouldStartLoad(request: WebViewNavigation) {
    try {
      const parsed = new URL(request.url);
      // Instagram fires intent:// URLs to upsell the native/Lite app; keep everything in-web.
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false;
      }
      return !blockedPaths.some((pattern) => pattern.test(parsed.pathname));
    } catch {
      return true;
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webView}
        userAgent={InstagramUserAgent}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        injectedJavaScript={injectedJavaScript}
        onNavigationStateChange={() => webViewRef.current?.injectJavaScript(injectedJavaScript)}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reload"
        hitSlop={8}
        onPress={() => webViewRef.current?.reload()}
        style={({ pressed }) => [styles.reloadButton, pressed && styles.reloadButtonPressed]}>
        <Text style={styles.reloadIcon}>↻</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  // Sits above Instagram's bottom nav bar, out of the way of the tab icons.
  reloadButton: {
    position: 'absolute',
    right: 12,
    bottom: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(38, 38, 38, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  reloadButtonPressed: {
    opacity: 0.6,
  },
  reloadIcon: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
});
