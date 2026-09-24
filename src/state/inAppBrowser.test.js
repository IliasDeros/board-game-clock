import { describe, expect, it } from 'vitest';
import { isFacebookInAppBrowser } from './inAppBrowser';

describe('isFacebookInAppBrowser', () => {
  it('detects the Messenger and Facebook iOS in-app browsers', () => {
    const messengerIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/480.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.0;FBSS/3;FBID/phone;FBLC/en_US]';
    const facebookIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0;FBBV/1]';
    expect(isFacebookInAppBrowser(messengerIos)).toBe(true);
    expect(isFacebookInAppBrowser(facebookIos)).toBe(true);
  });

  it('detects the Android in-app browser', () => {
    const android =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/480.0.0.0.0;]';
    expect(isFacebookInAppBrowser(android)).toBe(true);
  });

  it('leaves ordinary browsers alone', () => {
    const safari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    expect(isFacebookInAppBrowser(safari)).toBe(false);
    expect(isFacebookInAppBrowser(chrome)).toBe(false);
    expect(isFacebookInAppBrowser(undefined)).toBe(false);
  });
});
