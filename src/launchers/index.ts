/** Module purpose: supports devSteps index functionality. */
import type { SystemResult, PipelineContext, SystemId, ToolDetection } from '../types.js'
import { launchOpencode } from './opencode.js'
import { launchClaude } from './claude.js'
import { launchCodex } from './codex.js'
import { launchHuman } from './human.js'
import { launchDevcontrol } from './devcontrol.js'
import { launchAuto } from './auto.js'
import { detectTool, detectAllTools, getEnvironmentInfo } from './detector.js'

type LauncherFn = (config: Record<string, unknown>, context: PipelineContext) => Promise<SystemResult>

const registry: Record<SystemId, LauncherFn> = {
  opencode: launchOpencode,
  claude: launchClaude,
  codex: launchCodex,
  human: launchHuman,
  devcontrol: launchDevcontrol,
  auto: launchAuto,
}

export async function executeSystem(
  systemId: string,
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const launcher = registry[systemId as SystemId]
  if (!launcher) {
    return {
      systemId: systemId as SystemId,
      success: false,
      error: `Unknown system: ${systemId}. Available: ${Object.keys(registry).join(', ')}`,
    }
  }

  console.log(`[devSteps] → ${systemId}`)
  return launcher(config, context)
}

export function getAvailableSystems(): SystemId[] {
  return Object.keys(registry) as SystemId[]
}

export function isSystemAvailable(systemId: string): boolean {
  return systemId in registry
}

export { detectTool, detectAllTools, getEnvironmentInfo }
export type { ToolDetection }
