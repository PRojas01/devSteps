export type SystemId = 'opencode' | 'claude' | 'codex' | 'human' | 'devcontrol' | 'auto'
export type IntegrationMode = 'direct-cli' | 'file-based' | 'api' | 'unavailable'

export interface ToolDetection {
  systemId: SystemId
  available: boolean
  mode: IntegrationMode
  path?: string
  version?: string
  supportsNonInteractive: boolean
  details: string
}

export type Platform = 'linux' | 'darwin' | 'win32'
export type ProjectType = 'web-app' | 'cli-tool' | 'library' | 'api-service' | 'data-pipeline'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused'
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused'
export type GateResult = 'pass' | 'fail' | 'partial'
export type Severity = 'error' | 'warning' | 'info'
export type OnFailure = 'retry' | 'skip' | 'abort' | 'redirect'
export type OnPartial = 'retry' | 'review' | 'continue'

export interface DevStepsConfig {
  project: ProjectDefinition
  pipeline: StepDefinition[]
  standard?: string
}

export interface ProjectDefinition {
  name: string
  type: ProjectType
  version: string
  description: string
  stack: string[]
  standard: string
}

export interface StepDefinition {
  id: string
  name: string
  description: string
  type?: 'standard' | 'subpipeline'
  roles: StepRoles
  systems?: StepSystemConfig[]
  phases?: StepDefinition[]
  method?: MethodConfig
  maxIterations?: number
  entryCriteria?: string[]
  exitCriteria?: string[]
  next: StepRouting
  output?: string[]
  estimatedDuration?: string
}

export interface StepRoles {
  execute: SystemId[]
  approve: SystemId
  support?: SystemId[]
  governance?: SystemId[]
}

export interface StepSystemConfig {
  system: SystemId
  role: 'execute' | 'support' | 'governance'
  config?: Record<string, unknown>
}

export interface StepRouting {
  onSuccess: string
  onFailure: OnFailure
  onFailureTarget?: string
  onPartial: OnPartial
  onPartialTarget?: string
}

export interface MethodConfig {
  id: string
  params?: Record<string, unknown>
}

export interface ViabilityConfig {
  dimensions: ViabilityDimension[]
  weights: Record<string, number>
  threshold: {
    go: number
    iterate: number
    kill: number
  }
}

export interface ViabilityDimension {
  id: string
  name: string
  criteria: ViabilityCriterion[]
}

export interface ViabilityCriterion {
  name: string
  description: string
  scale: [number, number]
  labels: Record<number, string>
}

export interface ViabilityResult {
  scores: Record<string, number>
  weighted: number
  verdict: 'GO' | 'ITERATE' | 'KILL'
  details: ViabilityDetail[]
}

export interface ViabilityDetail {
  dimension: string
  average: number
  criteria: Array<{ name: string; score: number; label: string }>
}

export interface SystemResult {
  systemId: SystemId
  success: boolean
  output?: string
  artifacts?: string[]
  error?: string
}

export interface GateCheck {
  criteria: string
  result: GateResult
  message: string
}

export interface StepResult {
  stepId: string
  status: StepStatus
  startedAt?: string
  completedAt?: string
  systemResults: SystemResult[]
  artifacts: string[]
  gateChecks: GateCheck[]
  next: string
}

export interface PipelineContext {
  pipelineId: string
  status: PipelineStatus
  currentStep: string
  completedSteps: string[]
  artifacts: Map<string, ArtifactRecord>
  metadata: Record<string, unknown>
  startedAt: string
  updatedAt: string
  checkpointId?: string
}

export interface ArtifactRecord {
  id: string
  stepId: string
  path: string
  type: 'doc' | 'code' | 'config' | 'report' | 'decision'
  validated: boolean
  validationResults?: NormCheck[]
}

export interface Checkpoint {
  id: string
  pipelineId: string
  stepId: string
  timestamp: string
  context: PipelineContext
  label?: string
}

export interface NormDefinition {
  id: string
  name: string
  description: string
  category: NormCategory
  severity: Severity
  scope: string[]
  validation: NormValidation
  aiPrompt: string
}

export type NormCategory =
  | 'documentation'
  | 'security'
  | 'architecture'
  | 'quality'
  | 'testing'
  | 'git'
  | 'release'
  | 'project-setup'

export interface NormValidation {
  type: 'regex' | 'exists' | 'content' | 'structure' | 'command' | 'custom'
  pattern?: string
  patterns?: string[]
  checker?: string
}

export interface NormCheck {
  normId: string
  result: GateResult
  severity: Severity
  message: string
  filepath?: string
}

export interface StandardDefinition {
  id: string
  name: string
  version: string
  norms: NormDefinition[]
}

export interface PipelineDefinition {
  id: string
  name: string
  description: string
  type: ProjectType
  standard: string
  version: string
  steps: StepDefinition[]
}

export interface AgentPrompt {
  systemId: SystemId
  stepId: string
  role: string
  prompt: string
  context: string[]
  output: string[]
}

export interface DevStepsReport {
  pipelineId: string
  status: PipelineStatus
  steps: StepResult[]
  totalDuration: string
  artifactCount: number
  normsPassed: number
  normsFailed: number
  gatesPassed: number
  gatesFailed: number
}
