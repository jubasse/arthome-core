import { z } from 'zod';

import { DisplayState } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, uuidOut, vocabularyIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';
import { DRM_SYSTEMS } from '../../streaming/index.js';

const OPEN_PLAYBACK_KIND: readonly [typeof DisplayState.LIVE, typeof DisplayState.REPLAY] = [
  DisplayState.LIVE,
  DisplayState.REPLAY,
];

export const PlaybackSessionIdParameter: PathParameter<'sessionId', z.ZodString> = {
  name: 'sessionId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const OpenPlaybackBodySchema: z.ZodObject<
  {
    deviceId: z.ZodString;
    kind: VocabularyIn<typeof OPEN_PLAYBACK_KIND>;
    profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    capabilities: z.ZodOptional<
      z.ZodObject<
        {
          drmSystems: z.ZodOptional<z.ZodArray<VocabularyIn<typeof DRM_SYSTEMS>>>;
          hardwareSecureDecode: z.ZodOptional<z.ZodBoolean>;
          maxHeightPx: z.ZodOptional<z.ZodInt>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  deviceId: uuidOut().meta({
    description:
      '**This is what carries resumption.** An opening on a `deviceId` that already holds a live\nlease for this date **resumes that lease** and returns the same `sessionId`; it does not open\na second one and does not consume another screen. The promise "you can resume your own\nsession, identified by the device" was written in the answers to the surfaces and was carried\nnowhere in the contract.\n',
  }),
  kind: vocabularyIn(OPEN_PLAYBACK_KIND).meta({
    'x-arthome-vocabulary-source': 'DISPLAY_STATES',
    'x-arthome-vocabulary-narrowing':
      'Only two of the eleven states can be opened. The other nine are not refused as unknown values, they are not openable.',
    description:
      '**A strict narrowing of `DISPLAY_STATES`, and the narrowing is the rule.** Only two\nof the eleven states can be opened: you watch a date that is on air, or a replay.\nThe other nine are not refused here as unknown values, they are **not openable**.\n',
  }),
  profileId: uuidOut().nullable().optional(),
  capabilities: z
    .object({
      drmSystems: z
        .array(vocabularyIn(DRM_SYSTEMS).meta({ 'x-arthome-vocabulary-source': 'DRM_SYSTEMS' }))
        .optional(),
      hardwareSecureDecode: z.boolean().optional(),
      maxHeightPx: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    })
    .meta({
      description:
        'What the device **can do**, declared. The server chooses protocol, DRM and quality cap; **a\nclient that guesses gets it wrong**, and it gets it wrong on the devices we cannot test.\n',
    })
    .optional(),
});

export type OpenPlaybackBody = z.output<typeof OpenPlaybackBodySchema>;
