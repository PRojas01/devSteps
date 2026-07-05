/** Module purpose: supports devSteps skill injector functionality. */
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import type { DevStepsConfig, StepDefinition } from './types.js'
import { loadConfig } from './config.js'
import { DS_V1 } from './standard/ds-v1.js'

export interface InjectionResult {
  files: string[]
}

export function buildSkillInjection(config: DevStepsConfig): Record<string, string> {
  const steps = config.pipeline
  const norms = DS_V1.norms

  return {
    'CLAUDE.md': buildClaudeMd(config, steps, norms),
    '.cursorrules': buildCursorrules(config, steps, norms),
    '.windsurfrules': buildWindsurfrules(config, steps, norms),
    'copilot-instructions.md': buildCopilotInstructions(config, steps, norms),
    'AGENTS.md': buildAgentsMd(config, steps, norms),
  }
}

export function writeSkillFiles(
  files: Record<string, string>, projectRoot: string, config: DevStepsConfig,
): string[] {
  const written: string[] = []

  for (const [filename, content] of Object.entries(files)) {
    const dir = filename === 'copilot-instructions.md'
      ? join(projectRoot, '.devcontrol', 'injected')
      : projectRoot

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const filePath = resolve(dir, filename)
    writeFileSync(filePath, content, 'utf-8')
    written.push(filePath)
  }

  const devstepsDir = resolve(projectRoot, '.devsteps')
  if (!existsSync(devstepsDir)) mkdirSync(devstepsDir, { recursive: true })
  writeFileSync(
    join(devstepsDir, 'pipeline-summary.md'),
    buildPipelineSummary(config),
    'utf-8',
  )
  written.push(join(devstepsDir, 'pipeline-summary.md'))

  return written
}

function buildClaudeMd(config: DevStepsConfig, steps: StepDefinition[], norms: typeof DS_V1.norms): string {
  return `# ${config.project.name} — devSteps Pipeline

This project uses devSteps to orchestrate its development lifecycle.
Follow this pipeline strictly. Complete each step before moving to the next.

## Project
- **Name:** ${config.project.name}
- **Type:** ${config.project.type}
- **Stack:** ${config.project.stack.join(', ')}
- **Standard:** ${config.project.standard}

## Pipeline Steps

${steps.map((s, i) => `### ${i + 1}. ${s.id}: ${s.name}
${s.description}

**Execute with:** ${s.roles.execute.join(', ')}
**Approved by:** ${s.roles.approve}
${s.entryCriteria?.length ? `**Entry criteria:** ${s.entryCriteria.join(', ')}` : ''}
${s.exitCriteria?.length ? `**Exit criteria:** ${s.exitCriteria.join(', ')}` : ''}
${s.output?.length ? `**Output:** ${s.output.join(', ')}` : ''}
`).join('\n')}

## Standards (DS-v1)

${norms.filter(n => n.severity === 'error').map(n => `- **${n.id}** (🔴): ${n.description}`).join('\n')}

## devSteps Commands

- \`devsteps status\` — Check current step
- \`devsteps run\` — Run pipeline
- \`devsteps step:complete <id>\` — Mark step done
- \`devsteps validate\` — Validate against standard
- \`devsteps launch <step-id>\` — Launch tool for step
`
}

function buildCursorrules(config: DevStepsConfig, steps: StepDefinition[], norms: typeof DS_V1.norms): string {
  return `You are an AI coding agent working on ${config.project.name}.
Before writing code, check the devSteps pipeline to see what step you're on.

## Current Pipeline: ${config.project.type}

${steps.map(s => `- **${s.id}**: ${s.name} → execute with ${s.roles.execute.join(', ')}, approved by ${s.roles.approve}`).join('\n')}

## Quality Rules (DS-v1)

${norms.filter(n => n.severity === 'error').slice(0, 10).map(n => `- ${n.id}: ${n.name}`).join('\n')}

## Workflow

1. Check \`devsteps status\` before starting work
2. Complete the current step's tasks
3. Run \`devsteps validate\` to check quality
4. Run \`devsteps step:complete\` when done
5. Move to next step
`
}

function buildWindsurfrules(config: DevStepsConfig, steps: StepDefinition[], norms: typeof DS_V1.norms): string {
  return `# devSteps Pipeline — ${config.project.name}

## Project Type: ${config.project.type}

## Pipeline Steps
${steps.map(s => `- **${s.id} (${s.name})**: ${s.description}`).join('\n')}

## Required Standards
${norms.filter(n => n.severity === 'error').map(n => `- 🔴 ${n.id}: ${n.name}`).join('\n')}

## Agent Instructions
1. Always verify which pipeline step is active
2. Follow the exit criteria for each step
3. Validate all output against DS-v1 standards
4. Register completed work with \`devsteps step:complete\`
`
}

function buildCopilotInstructions(config: DevStepsConfig, steps: StepDefinition[], norms: typeof DS_V1.norms): string {
  return `# Copilot Instructions for ${config.project.name}

## Project Context
- Type: ${config.project.type}
- Stack: ${config.project.stack.join(', ')}

## Pipeline
${steps.map(s => `- ${s.id}: ${s.name} (${s.roles.execute.join('/')})`).join('\n')}

## Code Quality Rules
${norms.filter(n => n.severity === 'error').slice(0, 5).map(n => `- ${n.name}: ${n.description}`).join('\n')}

## Commit Format
Uses Conventional Commits: type(scope): description
Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
`
}

function buildAgentsMd(config: DevStepsConfig, steps: StepDefinition[], norms: typeof DS_V1.norms): string {
  return `# devSteps Agent Guide — ${config.project.name}

> Auto-generated. Do not edit manually. Run \`devsteps inject\` to regenerate.

## Project
${JSON.stringify({ name: config.project.name, type: config.project.type, stack: config.project.stack, standard: config.project.standard }, null, 2)}

## Active Pipeline
${JSON.stringify(steps.map(s => ({ id: s.id, name: s.name, systems: s.roles.execute, approve: s.roles.approve, output: s.output })), null, 2)}

## Standard (DS-v1)
${JSON.stringify(norms.map(n => ({ id: n.id, name: n.name, severity: n.severity, scope: n.scope })), null, 2)}

## Commands
- \`devsteps status\` — Current step
- \`devsteps run\` — Execute pipeline
- \`devsteps step:complete <id>\` — Complete step
- \`devsteps validate\` — Check quality
- \`devsteps doctor\` — Diagnose environment
`
}

function buildPipelineSummary(config: DevStepsConfig): string {
  const steps = config.pipeline
  return [
    `# Pipeline Summary — ${config.project.name}`,
    '',
    `**Type:** ${config.project.type} | **Stack:** ${config.project.stack.join(', ')}`,
    `**Standard:** ${config.project.standard} | **Steps:** ${steps.length}`,
    '',
    '## Flow',
    ...steps.map((s, i) => {
      const arrow = i < steps.length - 1 ? ' →' : ''
      return `${i + 1}. ${s.name} [${s.roles.execute.join(', ')}]${arrow}`
    }),
    '',
    '## Artifacts Tracked',
    ...steps.flatMap(s => (s.output ?? []).map(o => `- \`${o}\` (from ${s.id})`)),
  ].join('\n')
}

export function runInject(projectRoot: string): InjectionResult {
  const config = loadConfig(projectRoot)
  if (!config) throw new Error('No devsteps.yaml found. Run devsteps init first.')

  const files = buildSkillInjection(config)
  const written = writeSkillFiles(files, projectRoot, config)

  return { files: written }
}
