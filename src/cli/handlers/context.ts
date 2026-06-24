// IO discipline (see src/shared/hook-io.ts):
// - hookSpecificOutput.additionalContext → MODEL_CONTEXT (model consumes; via stdout JSON)
// - systemMessage                        → USER_HINT (user-visible; via stdout JSON systemMessage)
// This handler is PURE: it returns a HookResult and MUST NOT call
// process.stderr.write / process.stdout.write / console.* / process.exit.
// logger.* calls are DIAGNOSTIC and route through hook-io's stderr path.
import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import {
  executeWithWorkerFallback,
  isWorkerFallback,
} from '../../shared/worker-utils.js';
import { getProjectContext } from '../../utils/project-name.js';
import { HOOK_EXIT_CODES } from '../../shared/hook-constants.js';
import { logger } from '../../utils/logger.js';
import { loadFromFileOnce } from '../../shared/hook-settings.js';
import { readStaleMarker } from '../../shared/oauth-token.js';
import { shouldTrackProject } from '../../shared/should-track-project.js';

export const contextHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    const cwd = input.cwd ?? process.cwd();

    const emptyResult: HookResult = {
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: '' },
      exitCode: HOOK_EXIT_CODES.SUCCESS,
    };

    // Respect project filtering: an excluded or non-allow-listed project must
    // not get memory injected at SessionStart, mirroring the write-side gate.
    if (!shouldTrackProject(cwd)) {
      return emptyResult;
    }

    const context = getProjectContext(cwd);

    const settings = loadFromFileOnce();
    const showTerminalOutput = settings.CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT === 'true';

    const projectsParam = context.allProjects.join(',');
    const apiPath = `/api/context/inject?projects=${encodeURIComponent(projectsParam)}`;
    // Terminal session-start output shows only the Context Economics block, not
    // the full colored timeline (which is large enough to trip the harness's
    // "Output too large" persistence). The model still receives full context
    // via additionalContext below.
    const colorApiPath = input.platform === 'claude-code' ? `${apiPath}&colors=true&economics=true` : apiPath;

    const contextResult = await executeWithWorkerFallback<string>(apiPath, 'GET');
    if (isWorkerFallback(contextResult)) {
      return emptyResult;
    }

    let additionalContext: string;
    if (typeof contextResult === 'string') {
      additionalContext = contextResult.trim();
    } else if (contextResult === undefined) {
      additionalContext = '';
    } else {
      logger.warn('HOOK', 'Context response was not a string', { type: typeof contextResult });
      return emptyResult;
    }

    // Issue #2215: surface stale OAuth token marker as a session-start hint.
    // Marker is written by EnvManager.buildIsolatedEnvWithFreshOAuth() when
    // a previous worker spawn detected an expired keychain entry.
    const staleReason = readStaleMarker();
    if (staleReason) {
      const hint = `[claude-mem] Claude Desktop OAuth token is stale: ${staleReason}\nPlease re-login via Claude Desktop to refresh the token.`;
      additionalContext = additionalContext
        ? `${hint}\n\n${additionalContext}`
        : hint;
    }

    let coloredTimeline = '';
    if (showTerminalOutput) {
      const colorResult = await executeWithWorkerFallback<string>(colorApiPath, 'GET');
      if (!isWorkerFallback(colorResult) && typeof colorResult === 'string') {
        coloredTimeline = colorResult.trim();
      }
    }

    const platform = input.platform;

    const displayContent = coloredTimeline || (platform === 'gemini-cli' || platform === 'gemini' ? additionalContext : '');

    const systemMessage = showTerminalOutput && displayContent
      ? displayContent
      : undefined;

    return {
      // The additionalContext payload (memory legend) is large; without this
      // the harness renders an "Output too large (NN KB)" notice in place of
      // the raw hook stdout. additionalContext is still injected and any
      // systemMessage still shown — suppressOutput only hides the stdout dump.
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext
      },
      systemMessage
    };
  }
};
