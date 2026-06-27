import chalk from 'chalk'
import { loadConfig } from './config.js'
import { PipelineRunner } from './engine/pipeline.js'
import { executeSystem } from './launchers/index.js'
import { saveContextToDisk, loadContextFromDisk } from './engine/checkpoint.js'
import type { PipelineContext, SystemResult } from './types.js'
import { DS_V1 } from './standard/ds-v1.js'
import { validateProjectAgainstStandard } from './standard/validator.js'

interface AutopilotOptions {
  maxIterations?: number
  pauseOnFailure?: boolean
  pauseOnWarning?: boolean
  headless?: boolean
}

export async function runAutopilot(root: string, options: AutopilotOptions): Promise<void> {
  const config = loadConfig(root)
  if (!config) {
    console.log(chalk.red('No devsteps.yaml found.'))
    return
  }

  const maxIter = options.maxIterations ?? 50
  const pauseOnFail = options.pauseOnFailure ?? true
  const pauseOnWarn = options.pauseOnWarning ?? false

  console.log(chalk.bold('\n  🤖 devSteps Auto-Pilot'))
  console.log(chalk.dim('  Ejecución autónoma del pipeline con agentes AI'))
  console.log(chalk.dim(`  Límite: ${maxIter} iteraciones`))
  if (pauseOnFail) console.log(chalk.dim('  Pausa en errores: sí'))
  if (pauseOnWarn) console.log(chalk.dim('  Pausa en warnings: sí'))
  console.log('')

  let savedContext = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
  let iteration = 0

  while (iteration < maxIter) {
    iteration++
    console.log(chalk.cyan(`\n  Iteración ${iteration}/${maxIter}`))

    const runner = new PipelineRunner({
      steps: config.pipeline,
      metadata: {
        projectName: config.project.name,
        projectType: config.project.type,
        autopilot: true,
        iteration,
      },
      executeSystem: async (systemId, sysConfig, ctx) => {
        if (systemId === 'human') {
          if (options.headless) {
            return {
              systemId: 'human',
              success: true,
              output: 'Auto-pilot: skipped human step (headless mode)',
            } as SystemResult
          }
          const stepDef = config.pipeline.find(s => s.id === ctx.currentStep)
          sysConfig.instructions = sysConfig.instructions ?? stepDef?.description
        }
        return executeSystem(systemId, sysConfig, ctx)
      },
      onCheckpoint: async (ctx) => {
        saveContextToDisk(ctx as unknown as Record<string, unknown>, root, 'context')
      },
    })

    const report = await runner.run(savedContext?.currentStep)

    for (const step of report.steps) {
      const icon = step.status === 'completed' ? chalk.green('✓') : step.status === 'failed' ? chalk.red('✗') : chalk.yellow('~')
      const duration = step.startedAt && step.completedAt
        ? timeDiff(step.startedAt, step.completedAt)
        : '—'
      console.log(`  ${icon} ${step.stepId}: ${step.status} (${duration})`)
    }

    if (report.status === 'failed') {
      const failedSteps = report.steps.filter(s => s.status === 'failed')
      console.log(chalk.red(`\n  Pipeline falló en ${failedSteps.length} paso(s)`))
      for (const fs of failedSteps) {
        console.log(chalk.red(`    ${fs.stepId}: ${fs.systemResults.map(sr => sr.error).filter(Boolean).join(', ')}`))
      }
      if (pauseOnFail) {
        console.log(chalk.yellow('\n  Pausado por error. Ejecuta "devsteps resume" para continuar.'))
        return
      }
    }

    if (report.status === 'completed') {
      console.log(chalk.green('\n  ✅ Pipeline completado exitosamente en auto-pilot'))
      console.log(chalk.dim(`  Iteraciones: ${iteration}`))
      console.log(chalk.dim(`  Pasos: ${report.steps.length}`))
      console.log(chalk.dim(`  Gates: ${report.gatesPassed} passed, ${report.gatesFailed} failed`))
      break
    }

    if (report.status === 'paused') {
      const normsResult = validateProjectAgainstStandard(root, DS_V1.norms)
      const failed = normsResult.filter(r => r.result === 'fail')

      if (pauseOnWarn && failed.some(r => r.severity === 'warning')) {
        const warnings = failed.filter(r => r.severity === 'warning')
        console.log(chalk.yellow(`\n  ⚠ ${warnings.length} warnings — pausado por configuración`))
        return
      }

      const errors = failed.filter(r => r.severity === 'error')
      if (errors.length > 0) {
        console.log(chalk.yellow(`\n  ⚠ ${errors.length} errores de norma: continuando de todas formas...`))
      }
    }

    savedContext = loadContextFromDisk(root, 'context') as unknown as PipelineContext
  }

  if (iteration >= maxIter) {
    console.log(chalk.yellow(`\n  ⚠ Límite de ${maxIter} iteraciones alcanzado.`))
  }
}

function timeDiff(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
