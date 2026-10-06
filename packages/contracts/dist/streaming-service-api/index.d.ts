import { endRun, getRunConsole, goOnAir, raiseIncident, rehearseRun, resetRun, runTechnicalCheck } from './dates/routes.js';
import { resolveIncident } from './incidents/routes.js';
import { recordPlaybackPosition } from './me/routes.js';
import { openPlayback, releasePlayback, renewPlaybackTicket } from './playback/routes.js';
import { getViewerProgressBatch } from './viewer-progress/routes.js';
import type { Api } from '../http/index.js';
export declare const streamingServiceApi: Api<{
    getRunConsole: typeof getRunConsole;
    runTechnicalCheck: typeof runTechnicalCheck;
    rehearseRun: typeof rehearseRun;
    goOnAir: typeof goOnAir;
    endRun: typeof endRun;
    resetRun: typeof resetRun;
    raiseIncident: typeof raiseIncident;
    resolveIncident: typeof resolveIncident;
    openPlayback: typeof openPlayback;
    renewPlaybackTicket: typeof renewPlaybackTicket;
    releasePlayback: typeof releasePlayback;
    recordPlaybackPosition: typeof recordPlaybackPosition;
    getViewerProgressBatch: typeof getViewerProgressBatch;
}>;
//# sourceMappingURL=index.d.ts.map