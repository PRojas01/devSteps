import type { PipelineContext, ArtifactRecord, Checkpoint } from '../types.js'

export function createContext(pipelineId: string, metadata?: Record<string, unknown>): PipelineContext {
  return {
    pipelineId,
    status: 'idle',
    currentStep: '',
    completedSteps: [],
    artifacts: new Map(),
    metadata: metadata ?? {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function addArtifact(ctx: PipelineContext, artifact: ArtifactRecord): void {
  ctx.artifacts.set(artifact.id, artifact)
  ctx.updatedAt = new Date().toISOString()
}

export function getArtifact(ctx: PipelineContext, id: string): ArtifactRecord | undefined {
  return ctx.artifacts.get(id)
}

export function getArtifactsByStep(ctx: PipelineContext, stepId: string): ArtifactRecord[] {
  return [...ctx.artifacts.values()].filter(a => a.stepId === stepId)
}

export function updateMetadata(ctx: PipelineContext, key: string, value: unknown): void {
  ctx.metadata[key] = value
  ctx.updatedAt = new Date().toISOString()
}

export function createCheckpoint(ctx: PipelineContext, label?: string): Checkpoint {
  return {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pipelineId: ctx.pipelineId,
    stepId: ctx.currentStep,
    timestamp: new Date().toISOString(),
    context: JSON.parse(JSON.stringify(ctx)),
    label,
  }
}

export function restoreFromCheckpoint(cp: Checkpoint): PipelineContext {
  return cp.context
}
