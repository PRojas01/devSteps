import chalk from 'chalk'
import type { PipelineContext } from './types.js'
import { loadConfig } from './config.js'
import { loadContextFromDisk } from './engine/checkpoint.js'
import { DS_V1 } from './standard/ds-v1.js'
import { getAvailablePipelineTypes } from './catalog/pipelines.js'

interface DashboardOptions {
  refresh?: number
}

export function runDashboard(root: string, options: DashboardOptions): void {
  const config = loadConfig(root)
  if (!config) {
    console.log(chalk.red('No devsteps.yaml found.'))
    return
  }

  const savedData = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
  const steps = config.pipeline

  const refreshInterval = options.refresh ?? 5
  let running = true

  function render(): void {
    if (!running) return

    process.stdout.write('\x1b[2J\x1b[H')

    renderHeader(config, savedData)
    renderPipelineGraph(steps, savedData)
    renderProgress(steps, savedData)
    renderNormsSummary()
    renderToolStatus()

    console.log('')
    console.log(chalk.dim(`  Actualizando cada ${refreshInterval}s · Ctrl+C para salir`))
  }

  render()

  const interval = setInterval(() => {
    const freshData = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
    if (freshData) Object.assign(savedData ?? {}, freshData)
    render()
  }, refreshInterval * 1000)

  process.on('SIGINT', () => {
    running = false
    clearInterval(interval)
    console.log(chalk.dim('\n  Dashboard cerrado.'))
    process.exit(0)
  })
}

function renderHeader(config: any, context: PipelineContext | null): void {
  console.log(chalk.bold('┌─────────────────────────────────────────────────────────────┐'))
  console.log(chalk.bold('│                     DEVSTEPS DASHBOARD                      │'))
  console.log(chalk.bold('└─────────────────────────────────────────────────────────────┘'))
  console.log('')
  console.log(`  ${chalk.bold('Proyecto:')} ${config.project.name}`)
  console.log(`  ${chalk.bold('Tipo:')}     ${config.project.type}`)
  console.log(`  ${chalk.bold('Stack:')}    ${config.project.stack.join(', ')}`)
  console.log(`  ${chalk.bold('Estándar:')} ${config.project.standard}`)
  if (context) {
    const statusColor = context.status === 'completed' ? chalk.green
      : context.status === 'running' ? chalk.cyan
      : context.status === 'paused' ? chalk.yellow
      : context.status === 'failed' ? chalk.red
      : chalk.dim
    console.log(`  ${chalk.bold('Pipeline:')} ${statusColor(context.status.toUpperCase())}`)
  }
  console.log('')
}

function renderPipelineGraph(steps: any[], context: PipelineContext | null): void {
  console.log(chalk.bold('  Pipeline:'))
  console.log('')

  for (const [i, step] of steps.entries()) {
    const isDone = context?.completedSteps.includes(step.id)
    const isCurrent = context?.currentStep === step.id
    const isPending = !isDone && !isCurrent

    let icon: string
    let color: (s: string) => string
    if (isDone) {
      icon = '✅'
      color = chalk.green
    } else if (isCurrent) {
      icon = '🔄'
      color = chalk.cyan
    } else {
      icon = '⏳'
      color = chalk.dim
    }

    const name = `${step.id.split('-').slice(1).join('-')}`
    const label = `${i + 1}. ${name.padEnd(14)} ${step.name}`
    console.log(`  ${icon} ${color(label)}`)

    if (i < steps.length - 1) {
      const lineConn = isDone ? chalk.green('  │') : chalk.dim('  │')
      console.log(lineConn)
    }
  }
  console.log('')
}

function renderProgress(steps: any[], context: PipelineContext | null): void {
  if (!context) return

  const total = steps.length
  const completed = context.completedSteps.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const barWidth = 30
  const filled = Math.round((pct / 100) * barWidth)
  const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(barWidth - filled))

  console.log(chalk.bold('  Progreso:'))
  console.log(`  ${bar} ${chalk.bold(`${pct}%`)} (${completed}/${total} pasos)`)
  console.log('')

  if (context.artifacts.size > 0) {
    console.log(`  ${chalk.bold('Artefactos:')} ${context.artifacts.size} generados`)
    const types = [...context.artifacts.values()].reduce((acc: Record<string, number>, a: any) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1; return acc
    }, {} as Record<string, number>)
    const typeStr = Object.entries(types).map(([t, c]) => `${t}:${c}`).join(', ')
    console.log(chalk.dim(`  ${typeStr}`))
    console.log('')
  }
}

function renderNormsSummary(): void {
  console.log(chalk.bold('  Normas DS-v1:'))
  const categories = [...new Set(DS_V1.norms.map(n => n.category))]
  for (const cat of categories) {
    const norms = DS_V1.norms.filter(n => n.category === cat)
    const errors = norms.filter(n => n.severity === 'error').length
    const warnings = norms.filter(n => n.severity === 'warning').length
    const errorStr = errors > 0 ? chalk.red(`${errors} ✗`) : chalk.green(`${errors} ✓`)
    const warnStr = warnings > 0 ? chalk.yellow(`${warnings} ⚠`) : chalk.green(`${warnings} ✓`)
    console.log(`  ${chalk.dim(cat.padEnd(16))} ${errorStr}  ${warnStr}`)
  }
  console.log('')
}

function renderToolStatus(): void {
  console.log(chalk.bold('  Herramientas:'))
  const tools = ['opencode', 'claude', 'codex', 'human', 'devcontrol', 'auto']
  for (const tool of tools) {
    try {
      const { execSync } = require('child_process')
      const result = execSync(`which ${tool === 'devcontrol' ? 'sp-devcontrol' : tool} 2>/dev/null || echo not-found`, { encoding: 'utf-8' })
      const available = !result.trim().includes('not-found') && result.trim().length > 0
      console.log(`  ${available ? chalk.green('✓') : chalk.red('✗')} ${tool}`)
    } catch {
      console.log(`  ${chalk.red('✗')} ${tool}`)
    }
  }
}
