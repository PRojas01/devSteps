import type { StepResult, DevStepsReport, PipelineContext, NormCheck } from '../types.js'

export function formatStepResult(result: StepResult): string {
  const lines = [
    `  Step: ${result.stepId}`,
    `  Status: ${statusIcon(result.status)} ${result.status.toUpperCase()}`,
    `  Duration: ${result.startedAt && result.completedAt ? timeDiff(result.startedAt, result.completedAt) : 'N/A'}`,
  ]

  if (result.gateChecks.length > 0) {
    lines.push('  Gates:')
    for (const gate of result.gateChecks) {
      lines.push(`    ${gateIcon(gate.result)} ${gate.criteria}: ${gate.message}`)
    }
  }

  if (result.systemResults.length > 0) {
    lines.push('  Systems:')
    for (const sys of result.systemResults) {
      lines.push(`    ${sys.success ? '✓' : '✗'} ${sys.systemId}${sys.error ? `: ${sys.error}` : ''}`)
    }
  }

  if (result.artifacts.length > 0) {
    lines.push('  Artifacts:')
    for (const art of result.artifacts) lines.push(`    - ${art}`)
  }

  if (result.next) lines.push(`  Next: ${result.next}`)

  return lines.join('\n')
}

export function formatPipelineReport(report: DevStepsReport): string {
  const lines = [
    '═══════════════════════════════════════',
    '  DEVSTEPS PIPELINE REPORT',
    '═══════════════════════════════════════',
    `  Pipeline: ${report.pipelineId}`,
    `  Status: ${statusIconFromPipeline(report.status)} ${report.status.toUpperCase()}`,
    `  Duration: ${report.totalDuration}`,
    `  Steps: ${report.steps.length} total`,
    `  Gates passed: ${report.gatesPassed}`,
    `  Gates failed: ${report.gatesFailed}`,
    `  Norms passed: ${report.normsPassed}`,
    `  Norms failed: ${report.normsFailed}`,
    `  Artifacts: ${report.artifactCount}`,
    '',
    '  Steps:',
    ...report.steps.map(s => `    ${statusIcon(s.status)} ${s.stepId}: ${s.status}`),
    '',
    '═══════════════════════════════════════',
  ]
  return lines.join('\n')
}

export function formatContext(ctx: PipelineContext): string {
  const lines = [
    `Pipeline: ${ctx.pipelineId}`,
    `Status: ${ctx.status}`,
    `Current Step: ${ctx.currentStep || 'N/A'}`,
    `Completed: ${ctx.completedSteps.join(', ') || 'none'}`,
    `Artifacts: ${ctx.artifacts.size}`,
    `Started: ${ctx.startedAt}`,
  ]
  return lines.join('\n')
}

export function formatNormChecks(checks: NormCheck[]): string {
  const passed = checks.filter(c => c.result === 'pass')
  const failed = checks.filter(c => c.result === 'fail')
  const lines = [
    `Validation: ${passed.length} passed, ${failed.length} failed`,
    '',
  ]
  for (const check of checks) {
    lines.push(`  ${gateIcon(check.result)} ${check.normId}: ${check.message}`)
  }
  return lines.join('\n')
}

export function formatViabilityResult(scores: Record<string, number>, weighted: number, verdict: string): string {
  const lines = [
    '═══════════════════════════════════════',
    '  VIABILITY MATRIX RESULT',
    '═══════════════════════════════════════',
  ]
  for (const [dim, score] of Object.entries(scores)) {
    const bar = '█'.repeat(Math.round(score))
    lines.push(`  ${dim.padEnd(12)} ${bar} ${score.toFixed(1)}/5.0`)
  }
  lines.push('')
  lines.push(`  WEIGHTED: ${weighted.toFixed(2)}/5.0`)
  lines.push(`  VERDICT:  ${verdict === 'GO' ? '✅ GO' : verdict === 'ITERATE' ? '🔄 ITERATE' : '❌ KILL'}`)
  lines.push('═══════════════════════════════════════')
  return lines.join('\n')
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'running': return '🔄'
    case 'paused': return '⏸'
    case 'pending': return '⏳'
    case 'skipped': return '⏭'
    default: return '❓'
  }
}

function statusIconFromPipeline(status: string): string {
  switch (status) {
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'running': return '🔄'
    case 'paused': return '⏸'
    default: return '❓'
  }
}

function gateIcon(result: string): string {
  switch (result) {
    case 'pass': return '✓'
    case 'fail': return '✗'
    case 'partial': return '~'
    default: return '?'
  }
}

function timeDiff(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
