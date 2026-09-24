// Facebook and Messenger open shared links in their own in-app browser, whose
// webview is known to stall Firestore's streaming connection. Their user agents
// carry FBAN/FBAV (iOS and Android app tokens), FB_IAB (Android) or Messenger.
const FACEBOOK_IN_APP_BROWSER = /FBAN|FBAV|FBIOS|FB_IAB|Messenger/i;

export function isFacebookInAppBrowser(userAgent) {
  return FACEBOOK_IN_APP_BROWSER.test(userAgent ?? '');
}
