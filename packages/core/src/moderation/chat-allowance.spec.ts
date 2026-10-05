import { describe, expect, it } from 'vitest';

import { CHAT_ALLOWANCE_BY_SURFACE } from './index.js';
import { Surface } from '../vocabulary/people.js';

describe('the chat allowance served to a storefront surface', () => {
  it('covers the three storefront surfaces, the television the tightest', () => {
    const tv = CHAT_ALLOWANCE_BY_SURFACE[Surface.STOREFRONT_TV];
    const mobile = CHAT_ALLOWANCE_BY_SURFACE[Surface.STOREFRONT_MOBILE];
    const web = CHAT_ALLOWANCE_BY_SURFACE[Surface.STOREFRONT_WEB];
    expect(tv.messagesPerSecond).toBeLessThan(mobile.messagesPerSecond);
    expect(mobile.messagesPerSecond).toBeLessThan(web.messagesPerSecond);
    expect(tv.catchUpMessages).toBeLessThan(mobile.catchUpMessages);
    expect(Object.keys(CHAT_ALLOWANCE_BY_SURFACE)).toHaveLength(3);
  });
});
