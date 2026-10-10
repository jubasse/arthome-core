import { z } from 'zod';
import { DisplayState } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
import { DRM_SYSTEMS } from '../../streaming/index.js';
declare const OPEN_PLAYBACK_KIND: readonly [typeof DisplayState.LIVE, typeof DisplayState.REPLAY];
export declare const PlaybackSessionIdParameter: PathParameter<'sessionId', z.ZodString>;
export declare const OpenPlaybackBodySchema: z.ZodObject<{
    deviceId: z.ZodString;
    kind: VocabularyIn<typeof OPEN_PLAYBACK_KIND>;
    profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    capabilities: z.ZodOptional<z.ZodObject<{
        drmSystems: z.ZodOptional<z.ZodArray<VocabularyIn<typeof DRM_SYSTEMS>>>;
        hardwareSecureDecode: z.ZodOptional<z.ZodBoolean>;
        maxHeightPx: z.ZodOptional<z.ZodInt>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type OpenPlaybackBody = z.output<typeof OpenPlaybackBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map