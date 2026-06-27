import type {
  StepDefinition, StepResult, StepStatus, PipelineContext, SystemResult,
} from '../types.js'
import { evaluateEntryCriteria, evaluateExitCriteria, allPass } from './gates.js'
import { addArtifact } from './context.js'

export async function executeStep(
  step: StepDefinition,
  context: PipelineContext,
  executeSystemFn: (systemId: string, config: Record<string, unknown>, context: PipelineContext) => Promise<SystemResult>,
): Promise<StepResult> {
  const startedAt = new Date().toISOString()
  const systemResults: SystemResult[] = []
  const artifacts: string[] = []

  const gateContext = buildGateContext(context, step)
  const entryChecks = evaluateEntryCriteria(step.entryCriteria ?? [], gateContext)
  const entryPass = allPass(entryChecks)

  if (!entryPass && step.next.onFailure === 'abort') {
    return {
      stepId: step.id,
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      systemResults,
      artifacts,
      gateChecks: entryChecks,
      next: step.next.onFailureTarget ?? 'abort',
    }
  }

  const sysConfigs = step.systems ?? []
  for (const sysConfig of sysConfigs) {
    try {
      const result = await executeSystemFn(sysConfig.system, sysConfig.config ?? {}, context)
      systemResults.push(result)
      if (result.artifacts) {
        artifacts.push(...result.artifacts)
        for (const artifactPath of result.artifacts) {
          addArtifact(context, {
            id: `${step.id}-${artifactPath}`,
            stepId: step.id,
            path: artifactPath,
            type: inferArtifactType(artifactPath),
            validated: false,
          })
        }
      }
    } catch (err) {
      systemResults.push({
        systemId: sysConfig.system,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const allSystemsPassed = systemResults.every(r => r.success)
  const exitChecks = allSystemsPassed
    ? evaluateExitCriteria(step.exitCriteria ?? [], buildGateContext(context, step))
    : []
  const exitPass = allPass(exitChecks)

  let status: StepStatus
  if (!allSystemsPassed) {
    status = 'failed'
  } else if (!exitPass) {
    status = 'paused'
  } else {
    status = 'completed'
  }

  const next = determineNext(step, status)

  return {
    stepId: step.id,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    systemResults,
    artifacts,
    gateChecks: [...entryChecks, ...exitChecks],
    next,
  }
}

function determineNext(step: StepDefinition, status: StepStatus): string {
  if (status === 'completed') return step.next.onSuccess
  if (status === 'failed') return step.next.onFailureTarget ?? step.next.onFailure
  if (status === 'paused') return step.next.onPartialTarget ?? step.id
  return step.next.onSuccess
}

function buildGateContext(context: PipelineContext, step: StepDefinition): Record<string, unknown> {
  return {
    ...context.metadata,
    artifacts: [...context.artifacts.keys()],
    stepId: step.id,
    stepName: step.name,
  }
}

function inferArtifactType(path: string): 'doc' | 'code' | 'config' | 'report' | 'decision' {
  if (path.endsWith('.md')) return 'doc'
  if (path.endsWith('.ts') || path.endsWith('.js') || path.endsWith('.py')) return 'code'
  if (path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) return 'config'
  if (path.includes('report')) return 'report'
  if (path.includes('decision')) return 'decision'
  return 'doc'
}
