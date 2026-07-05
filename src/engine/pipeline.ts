/** Module purpose: supports devSteps pipeline functionality. */
import type {
  StepDefinition, StepResult, PipelineContext, PipelineStatus, StepStatus, DevStepsReport, SystemResult,
} from '../types.js'
import { createContext, createCheckpoint } from './context.js'
import { executeStep } from './step.js'

export interface SystemExecutor {
  (systemId: string, config: Record<string, unknown>, context: PipelineContext): Promise<SystemResult>
}

interface PipelineOptions {
  steps: StepDefinition[]
  metadata?: Record<string, unknown>
  executeSystem: SystemExecutor
  onCheckpoint?: (ctx: PipelineContext) => Promise<void>
}

export class PipelineRunner {
  private steps: StepDefinition[]
  private context: PipelineContext
  private executeSystem: SystemExecutor
  private onCheckpoint?: (ctx: PipelineContext) => Promise<void>
  private stepIndex: number
  private stepMap: Map<string, StepDefinition>
  private results: StepResult[]

  constructor(options: PipelineOptions) {
    this.steps = options.steps
    this.executeSystem = options.executeSystem
    this.onCheckpoint = options.onCheckpoint
    this.context = createContext('pipeline-' + Date.now(), options.metadata)
    this.stepIndex = 0
    this.stepMap = new Map(this.steps.map(s => [s.id, s]))
    this.results = []
  }

  getContext(): PipelineContext {
    return this.context
  }

  getResults(): StepResult[] {
    return [...this.results]
  }

  getStatus(): PipelineStatus {
    return this.context.status
  }

  async run(startFrom?: string): Promise<DevStepsReport> {
    this.context.status = 'running'
    const startId = startFrom ?? this.steps[0]?.id
    if (!startId) throw new Error('No steps defined')

    const startIdx = this.steps.findIndex(s => s.id === startId)
    if (startIdx === -1) throw new Error(`Step '${startId}' not found`)

    this.stepIndex = startIdx

    while (this.stepIndex < this.steps.length) {
      const step = this.steps[this.stepIndex]
      if (!step) break

      this.context.currentStep = step.id
      const result = await executeStep(step, this.context, this.executeSystem)
      this.results.push(result)

      await this.saveCheckpoint()

      if (result.status === 'failed') {
        if (step.next.onFailure === 'abort') {
          this.context.status = 'failed'
          break
        }
        if (step.next.onFailure === 'redirect' && step.next.onFailureTarget) {
          this.stepIndex = this.steps.findIndex(s => s.id === step.next.onFailureTarget)
          if (this.stepIndex === -1) this.stepIndex++
          continue
        }
        if (step.next.onFailure === 'retry') {
          continue
        }
        if (step.next.onFailure === 'skip') {
          this.context.completedSteps.push(step.id)
          this.stepIndex++
          continue
        }
      }

      if (result.status === 'paused') {
        this.context.status = 'paused'
        break
      }

      if (result.status === 'completed') {
        this.context.completedSteps.push(step.id)
        if (step.next.onSuccess === 'abort') break
        const nextStep = step.next.onSuccess === 'next'
          ? this.steps[this.stepIndex + 1]?.id
          : step.next.onSuccess
        this.stepIndex = this.steps.findIndex(s => s.id === nextStep)
        if (this.stepIndex === -1) this.stepIndex++
      }
    }

    if (this.context.status !== 'paused' && this.context.status !== 'failed') {
      this.context.status = 'completed'
    }

    return this.buildReport()
  }

  async resume(): Promise<DevStepsReport> {
    if (this.context.status !== 'paused') {
      throw new Error('Pipeline is not paused')
    }
    this.context.status = 'running'
    const pausedStepIdx = this.steps.findIndex(s => s.id === this.context.currentStep)
    this.stepIndex = pausedStepIdx >= 0 ? pausedStepIdx : this.stepIndex
    return this.run(this.context.currentStep)
  }

  private async saveCheckpoint(): Promise<void> {
    if (!this.onCheckpoint) return
    const cp = createCheckpoint(this.context)
    this.context.checkpointId = cp.id
    await this.onCheckpoint(this.context)
  }

  private buildReport(): DevStepsReport {
    const passed = this.results.filter(r => r.status === 'completed')
    const failed = this.results.filter(r => r.status === 'failed')
    const allGates = this.results.flatMap(r => r.gateChecks)
    const start = new Date(this.context.startedAt)
    const end = new Date()

    return {
      pipelineId: this.context.pipelineId,
      status: this.context.status,
      steps: this.results,
      totalDuration: `${Math.round((end.getTime() - start.getTime()) / 1000)}s`,
      artifactCount: this.context.artifacts.size,
      normsPassed: allGates.filter(g => g.result === 'pass').length,
      normsFailed: allGates.filter(g => g.result === 'fail').length,
      gatesPassed: passed.length,
      gatesFailed: failed.length,
    }
  }
}
