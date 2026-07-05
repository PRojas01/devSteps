/** Module purpose: supports devSteps pipelines functionality. */
import type { PipelineDefinition, ProjectType, StepDefinition } from '../types.js'

const COMMON_KICKOFF: StepDefinition = {
  id: '1-validate-idea',
  name: 'Validar Idea',
  description: 'Evaluación multi-agente de la idea: investigación, análisis, iteración, matriz de viabilidad',
  roles: { execute: ['opencode', 'claude', 'codex'], approve: 'human' },
  systems: [
    { system: 'human', role: 'execute', config: { instructions: 'Define la idea del proyecto. Luego los agentes investigarán y evaluarán.' } },
    { system: 'opencode', role: 'support', config: { prompt: 'Investiga proyectos similares a esta idea en GitHub y el mercado' } },
    { system: 'claude', role: 'support', config: { prompt: 'Analiza competidores y alternativas para esta idea' } },
    { system: 'codex', role: 'support', config: { prompt: 'Investiga el stack tecnológico recomendado para esta idea' } },
  ],
  maxIterations: 3,
  entryCriteria: ['Idea definida'],
  exitCriteria: ['decision.md:exists', 'idea:validated'],
  next: { onSuccess: '2-design', onFailure: 'retry', onPartial: 'review' },
  output: ['decision.md', 'research.md', 'analysis.md'],
  estimatedDuration: '1-2h',
}

const COMMON_DESIGN: StepDefinition = {
  id: '2-design',
  name: 'Diseñar',
  description: 'Diseño de la solución: requisitos, arquitectura, decisiones. DevControl valida contra el estándar.',
  roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] },
  systems: [
    { system: 'opencode', role: 'execute', config: { prompt: 'Genera los documentos de diseño del proyecto: requisitos, arquitectura, ADRs' } },
    { system: 'devcontrol', role: 'governance', config: { action: 'validate', standard: 'ds-v1' } },
  ],
  entryCriteria: ['decision.md:exists', 'decision:equals=GO'],
  exitCriteria: ['docs/requirements.md:exists', 'docs/architecture.md:exists', 'docs:validated'],
  next: { onSuccess: '3-init', onFailure: 'redirect', onFailureTarget: '2-design', onPartial: 'review' },
  output: ['docs/requirements.md', 'docs/architecture.md', 'docs/adr-*.md'],
  estimatedDuration: '2-4h',
}

const COMMON_INIT: StepDefinition = {
  id: '3-init',
  name: 'Inicializar',
  description: 'Scaffolding del proyecto: estructura, configuración, dependencias, git',
  roles: { execute: ['opencode'], approve: 'human' },
  systems: [
    { system: 'opencode', role: 'execute', config: { prompt: 'Crea la estructura del proyecto: directorios, package.json, tsconfig.json, src/, tests/, docs/' } },
    { system: 'auto', role: 'support', config: { commands: ['npm install', 'git init'] } },
  ],
  entryCriteria: ['docs/architecture.md:exists'],
  exitCriteria: ['package.json:exists', 'src/:exists', 'git:initialized'],
  next: { onSuccess: '4-develop', onFailure: 'retry', onPartial: 'retry' },
  output: ['package.json', 'tsconfig.json', 'src/', 'tests/'],
  estimatedDuration: '30min-1h',
}

const COMMON_DEVELOP: StepDefinition = {
  id: '4-develop',
  name: 'Desarrollar',
  description: 'Desarrollo con gobernanza DevControl: watch mode, sesiones, approvals',
  roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] },
  systems: [
    { system: 'opencode', role: 'execute', config: { prompt: 'Desarrolla las funcionalidades del proyecto siguiendo el diseño' } },
    { system: 'devcontrol', role: 'governance', config: { action: 'session:start', objective: 'Desarrollo gobernado' } },
    { system: 'devcontrol', role: 'governance', config: { action: 'watch:start' } },
  ],
  maxIterations: 10,
  entryCriteria: ['src/:exists', 'package.json:exists'],
  exitCriteria: ['DS-040:validated', 'DS-050:validated'],
  next: { onSuccess: '5-verify', onFailure: 'redirect', onFailureTarget: '4-develop', onPartial: 'continue' },
  output: ['src/**/*', 'tests/**/*'],
  estimatedDuration: 'días-semanas',
}

const COMMON_VERIFY: StepDefinition = {
  id: '5-verify',
  name: 'Verificar',
  description: 'Quality gates: typecheck, lint, tests, code review, compliance',
  roles: { execute: ['auto', 'opencode'], approve: 'human' },
  systems: [
    { system: 'auto', role: 'execute', config: { commands: ['npm run typecheck', 'npm run lint', 'npm test'] } },
    { system: 'opencode', role: 'support', config: { prompt: 'Revisa el código: verifica calidad, seguridad, y buenas prácticas' } },
  ],
  entryCriteria: ['tests/:exists'],
  exitCriteria: ['typecheck:pass', 'lint:pass', 'test:pass', 'DS-070:validated'],
  next: { onSuccess: '6-release', onFailure: 'redirect', onFailureTarget: '4-develop', onPartial: 'review' },
  output: ['test-report.md'],
  estimatedDuration: '30min-2h',
}

const COMMON_REVIEW: StepDefinition = {
  id: '5.5-review',
  name: 'Revisar',
  description: 'Code review y validación final antes de release',
  roles: { execute: ['opencode'], approve: 'human' },
  systems: [
    { system: 'opencode', role: 'execute', config: { prompt: 'Realiza code review completo del proyecto' } },
  ],
  entryCriteria: ['DS-050:validated'],
  exitCriteria: ['review:approved'],
  next: { onSuccess: '6-release', onFailure: 'redirect', onFailureTarget: '4-develop', onPartial: 'review' },
  output: ['review-report.md'],
  estimatedDuration: '1-2h',
}

const COMMON_RELEASE: StepDefinition = {
  id: '6-release',
  name: 'Release',
  description: 'Versionado, changelog, build y publicación',
  roles: { execute: ['auto', 'human'], approve: 'human' },
  systems: [
    { system: 'auto', role: 'execute', config: { commands: ['npm version patch', 'npm run build'] } },
    { system: 'human', role: 'execute', config: { instructions: 'Revisa y aprueba el release. Verifica version, changelog, y build.' } },
  ],
  entryCriteria: ['test:pass', 'review:approved'],
  exitCriteria: ['CHANGELOG.md:exists', 'build:success', 'version:bumped'],
  next: { onSuccess: '7-maintain', onFailure: 'retry', onPartial: 'review' },
  output: ['CHANGELOG.md', 'dist/', 'git-tag'],
  estimatedDuration: '30min',
}

const COMMON_MAINTAIN: StepDefinition = {
  id: '7-maintain',
  name: 'Mantener',
  description: 'Ciclo de mantenimiento perpetuo: bugs, features, parches',
  roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] },
  systems: [
    { system: 'opencode', role: 'execute', config: { prompt: 'Mantenimiento del proyecto: corrige bugs, añade features, publica parches' } },
    { system: 'devcontrol', role: 'governance', config: { action: 'session:start' } },
  ],
  maxIterations: 999,
  entryCriteria: ['release:completed'],
  exitCriteria: [],
  next: { onSuccess: '7-maintain', onFailure: 'redirect', onFailureTarget: '4-develop', onPartial: 'continue' },
  output: [],
  estimatedDuration: 'indefinido',
}

const PIPELINE_TEMPLATES: Record<ProjectType, StepDefinition[]> = {
  'web-app': [COMMON_KICKOFF, COMMON_DESIGN, COMMON_INIT, COMMON_DEVELOP, COMMON_VERIFY, COMMON_REVIEW, COMMON_RELEASE, COMMON_MAINTAIN],
  'cli-tool': [COMMON_KICKOFF, COMMON_DESIGN, COMMON_INIT, COMMON_DEVELOP, COMMON_VERIFY, COMMON_RELEASE, COMMON_MAINTAIN],
  'library': [COMMON_KICKOFF, COMMON_DESIGN, COMMON_INIT, COMMON_DEVELOP, COMMON_VERIFY, COMMON_RELEASE, COMMON_MAINTAIN],
  'api-service': [COMMON_KICKOFF, COMMON_DESIGN, COMMON_INIT, COMMON_DEVELOP, COMMON_VERIFY, COMMON_REVIEW, COMMON_RELEASE, COMMON_MAINTAIN],
  'data-pipeline': [COMMON_KICKOFF, COMMON_DESIGN, COMMON_INIT, COMMON_DEVELOP, COMMON_VERIFY, COMMON_RELEASE, COMMON_MAINTAIN],
}

export function getPipelineForType(type: ProjectType): PipelineDefinition {
  const steps = PIPELINE_TEMPLATES[type] ?? PIPELINE_TEMPLATES['web-app']
  return {
    id: `full-sdlc-${type}`,
    name: `Full SDLC (${type})`,
    description: `Ciclo completo de desarrollo para proyectos tipo ${type}`,
    type,
    standard: 'ds-v1',
    version: '1.0.0',
    steps,
  }
}

export function getAvailablePipelineTypes(): ProjectType[] {
  return Object.keys(PIPELINE_TEMPLATES) as ProjectType[]
}

export function getPipelineForSteps(steps: StepDefinition[], id?: string): PipelineDefinition {
  return {
    id: id ?? 'custom-pipeline',
    name: 'Custom Pipeline',
    description: 'Pipeline definido por el usuario',
    type: 'web-app',
    standard: 'ds-v1',
    version: '1.0.0',
    steps,
  }
}
