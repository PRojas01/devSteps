/** Module purpose: supports devSteps history functionality. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import type { DevStepsReport } from './types.js'

interface HistoryEntry {
  projectName: string
  projectType: string
  timestamp: string
  report: DevStepsReport
  normsPassed: number
  normsFailed: number
  duration: string
}

const HISTORY_FILE = '.devsteps/history.jsonl'

function getHistoryPath(root: string): string {
  return resolve(root, HISTORY_FILE)
}

export function recordHistory(root: string, report: DevStepsReport, projectName: string, projectType: string): void {
  const entry: HistoryEntry = {
    projectName,
    projectType,
    timestamp: new Date().toISOString(),
    report,
    normsPassed: report.normsPassed,
    normsFailed: report.normsFailed,
    duration: report.totalDuration,
  }

  const path = getHistoryPath(root)
  const dir = resolve(root, '.devsteps')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  writeFileSync(path, JSON.stringify(entry) + '\n', { flag: 'a' })
}

export function readHistory(root: string, limit?: number): HistoryEntry[] {
  const path = getHistoryPath(root)
  if (!existsSync(path)) return []

  const content = readFileSync(path, 'utf-8').trim()
  if (!content) return []

  const entries = content.split('\n').map(line => JSON.parse(line) as HistoryEntry)
  return limit ? entries.slice(-limit) : entries
}

export function showHistory(root: string, options: { limit?: number; stats?: boolean }): void {
  const entries = readHistory(root, options.limit)

  if (entries.length === 0) {
    console.log(chalk.yellow('\n  No hay historial de ejecuciones.'))
    console.log(chalk.dim('  El historial se registra automáticamente al ejecutar pipelines.'))
    return
  }

  console.log(chalk.bold(`\n  📊 Historial de ejecuciones (${entries.length} registros)\n`))

  if (options.stats) {
    const total = entries.length
    const completed = entries.filter(e => e.report.status === 'completed').length
    const failed = entries.filter(e => e.report.status === 'failed').length
    const avgNormsFailed = entries.reduce((s, e) => s + e.normsFailed, 0) / total
    const avgNormsPassed = entries.reduce((s, e) => s + e.normsPassed, 0) / total
    const totalNormsFailed = entries.reduce((s, e) => s + e.normsFailed, 0)
    const totalNormsPassed = entries.reduce((s, e) => s + e.normsPassed, 0)

    console.log(chalk.bold('  Estadísticas globales:'))
    console.log(`  Total ejecuciones:    ${total}`)
    console.log(`  Completados:          ${chalk.green(completed.toString())}`)
    console.log(`  Fallidos:              ${chalk.red(failed.toString())}`)
    console.log(`  Tasa de éxito:        ${chalk.cyan(`${total > 0 ? Math.round((completed / total) * 100) : 0}%`)}`)
    console.log(`  Promedio normas OK:   ${chalk.green(avgNormsPassed.toFixed(1))}`)
    console.log(`  Promedio normas FAIL: ${chalk.red(avgNormsFailed.toFixed(1))}`)
    console.log(`  Total normas OK:      ${chalk.green(totalNormsPassed.toString())}`)
    console.log(`  Total normas FAIL:    ${chalk.red(totalNormsFailed.toString())}`)
    console.log('')
  }

  for (const [i, entry] of entries.entries()) {
    const statusIcon = entry.report.status === 'completed' ? chalk.green('✓')
      : entry.report.status === 'failed' ? chalk.red('✗')
      : chalk.yellow('~')
    const date = new Date(entry.timestamp).toLocaleDateString()
    const time = new Date(entry.timestamp).toLocaleTimeString()
    console.log(`  ${statusIcon} #${i + 1} ${chalk.bold(entry.projectName)}`)
    console.log(chalk.dim(`     ${date} ${time} · ${entry.projectType} · ${entry.duration}`))
    console.log(chalk.dim(`     Normas: ${entry.normsPassed}✓ ${entry.normsFailed}✗ · Pasos: ${entry.report.steps.length}`))
  }

  console.log('')
}
