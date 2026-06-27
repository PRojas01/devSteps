import inquirer from 'inquirer'
import chalk from 'chalk'
import type { StepDefinition, DevStepsConfig, PipelineContext } from './types.js'
import { loadConfig, saveConfig, createDefaultConfig, configExists } from './config.js'
import { PipelineRunner } from './engine/pipeline.js'
import { executeSystem } from './launchers/index.js'
import { getPipelineForType, getAvailablePipelineTypes } from './catalog/pipelines.js'
import { saveContextToDisk, loadContextFromDisk } from './engine/checkpoint.js'
import { formatPipelineReport } from './utils/format.js'
import { DS_V1 } from './standard/ds-v1.js'

function box(text: string, color: (s: string) => string = chalk.cyan): string {
  const lines = text.split('\n')
  const width = Math.min(70, Math.max(...lines.map(l => l.length)) + 4)
  const top = '┌' + '─'.repeat(width) + '┐'
  const bottom = '└' + '─'.repeat(width) + '┘'
  const middle = lines.map(l => '│ ' + l.padEnd(width - 2) + '│')
  return color([top, ...middle, bottom].join('\n'))
}

function stepExplanation(step: StepDefinition): string {
  const lines: string[] = []
  lines.push(chalk.bold(`📋 ${step.id}: ${step.name}`))
  lines.push('')
  lines.push(step.description)
  lines.push('')
  lines.push(chalk.dim(`Sistemas: ${step.roles.execute.join(', ')}`))
  if (step.roles.governance?.length) lines.push(chalk.dim(`Gobernanza: ${step.roles.governance.join(', ')}`))
  if (step.entryCriteria?.length) lines.push(chalk.yellow(`Criterios entrada: ${step.entryCriteria.join(', ')}`))
  if (step.exitCriteria?.length) lines.push(chalk.green(`Criterios salida: ${step.exitCriteria.join(', ')}`))
  if (step.output?.length) lines.push(chalk.blue(`Outputs: ${step.output.join(', ')}`))
  if (step.estimatedDuration) lines.push(chalk.magenta(`Duración estimada: ${step.estimatedDuration}`))
  if (step.maxIterations) lines.push(chalk.dim(`Máx iteraciones: ${step.maxIterations}`))
  return lines.join('\n')
}

function explainNorm(normId: string): string {
  const norm = DS_V1.norms.find(n => n.id === normId)
  if (!norm) return chalk.red(`Norma ${normId} no encontrada`)
  const severityColor = norm.severity === 'error' ? chalk.red : chalk.yellow
  const lines: string[] = []
  lines.push(chalk.bold(`📏 ${norm.id}: ${norm.name}`))
  lines.push(`  ${norm.description}`)
  lines.push(`  Categoría: ${norm.category} | Severidad: ${severityColor(norm.severity.toUpperCase())}`)
  lines.push(`  Alcance: ${norm.scope.join(', ') || 'global'}`)
  lines.push(`  Validación: ${norm.validation.type}${norm.validation.pattern ? ` (${norm.validation.pattern})` : ''}`)
  lines.push('')
  lines.push(chalk.italic('🤖 AI Prompt:'))
  lines.push(`  ${norm.aiPrompt}`)
  return lines.join('\n')
}

const PIPELINE_OVERVIEW: Record<string, string> = {
  '1-validate-idea': 'Define y valida tu idea: investigación de mercado, análisis de competencia, y matriz de viabilidad. Múltiples agentes trabajan en paralelo.',
  '2-design': 'Diseña la arquitectura: requisitos, decisiones técnicas (ADRs), y validación contra el estándar DS-v1.',
  '3-init': 'Crea la estructura del proyecto: directorios, configuración, dependencias, y control de versiones.',
  '4-develop': 'Desarrollo principal con sesiones de gobernanza DevControl. Ciclos iterativos con validación continua.',
  '5-verify': 'Gates de calidad: typecheck, lint, tests, code review, y cumplimiento de normas.',
  '5.5-review': 'Code review final antes del release. Aprobación humana requerida.',
  '6-release': 'Versionado semántico, changelog, build y publicación. Release empaquetado y etiquetado.',
  '7-maintain': 'Ciclo perpetuo de mantenimiento: bugs, features, parches, y nuevas versiones.',
}

function mentorStep(stepId: string): string {
  const overview = PIPELINE_OVERVIEW[stepId]
  if (!overview) return ''
  const normRefs: Record<string, string[]> = {
    '1-validate-idea': ['DS-003 (requirements)', 'DS-005 (ADRs)'],
    '2-design': ['DS-004 (architecture)', 'DS-005 (ADRs)'],
    '3-init': ['DS-090 (package.json)', 'DS-091 (tsconfig.json)', 'DS-071 (.gitignore)'],
    '4-develop': ['DS-010..013 (security)', 'DS-020..022 (architecture)', 'DS-030..032 (quality)', 'DS-050..051 (testing)'],
    '5-verify': ['DS-050 (tests)', 'DS-051 (no any)', 'DS-070 (commits)'],
    '5.5-review': ['DS-002 (module docs)', 'DS-031 (no console.log)', 'DS-032 (file length)'],
    '6-release': ['DS-080 (changelog)', 'DS-081 (semver)', 'DS-072 (license)'],
    '7-maintain': ['DS-070 (conventional commits)', 'DS-010 (no secrets)'],
  }
  const relatedNorms = normRefs[stepId] ?? []
  const lines: string[] = []
  lines.push(chalk.bold('🎓 Mentoría'))
  lines.push('')
  lines.push(overview)
  lines.push('')
  lines.push(chalk.bold('💡 Buenas prácticas:'))
  const tips: Record<string, string[]> = {
    '1-validate-idea': ['Investiga 3+ competidores antes de decidir', 'Usa la matriz de viabilidad con datos reales', 'Documenta decisiones con ADRs desde el día 1'],
    '2-design': ['No sobrediseñes — YAGNI', 'Documenta por qué NO elegiste alternativas', 'Valida la arquitectura con el equipo antes de codificar'],
    '3-init': ['Configura CI/CD desde el inicio', 'Elige licencia apropiada para tu proyecto', 'Define .gitignore específico para tu stack'],
    '4-develop': ['Commits pequeños y frecuentes', 'Escribe tests antes del código (TDD)', 'Ejecuta validaciones locales antes de push'],
    '5-verify': ['Automatiza todo lo que puedas verificar', 'No bajes la calidad por presión de tiempo', 'Revisa seguridad y rendimiento además de funcionalidad'],
    '5.5-review': ['Revisa en voz alta el código complejo', 'Busca sesgos cognitivos en decisiones', 'Verifica que cada archivo tenga un propósito claro'],
    '6-release': ['Usa versionado semántico estrictamente', 'Mantén un changelog legible por humanos', 'Automatiza el proceso de release al máximo'],
    '7-maintain': ['Prioriza deuda técnica junto a features', 'Mantén actualizadas las dependencias', 'Documenta bugs conocidos y workarounds'],
  }
  for (const tip of tips[stepId] ?? []) lines.push(`  • ${tip}`)
  if (relatedNorms.length > 0) {
    lines.push('')
    lines.push(chalk.bold('📏 Normas relacionadas:'))
    for (const n of relatedNorms) lines.push(`  • ${n}`)
  }
  return lines.join('\n')
}

export interface GuideOptions {
  step?: string
  auto?: boolean
}

export async function runGuide(root: string, options: GuideOptions): Promise<void> {
  let config = loadConfig(root)
  if (!config) {
    console.log(box('No hay proyecto devSteps. Vamos a inicializar uno.', chalk.yellow))
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Nombre del proyecto:', default: root.split('/').pop() ?? 'my-project' },
      { type: 'list', name: 'type', message: 'Tipo de proyecto:', choices: getAvailablePipelineTypes(), default: 'web-app' },
      { type: 'input', name: 'description', message: 'Descripción:', default: '' },
      { type: 'input', name: 'stack', message: 'Stack tecnológico (separado por comas):', default: 'typescript,node' },
    ])
    config = createDefaultConfig(answers.name, answers.type, answers.description, answers.stack.split(',').map((s: string) => s.trim()))
    saveConfig(config, root)
    console.log(chalk.green(`\n✓ Proyecto "${answers.name}" inicializado`))
    console.log('')
  }

  const steps = config.pipeline
  if (steps.length === 0) {
    console.log(chalk.red('El pipeline no tiene pasos definidos.'))
    return
  }

  console.log(box(`Bienvenido a devSteps Guide — ${config.project.name}\n\nEste modo te guiará paso a paso por el pipeline\nde desarrollo. Cada paso incluye explicación,\nmentoría, y opciones de ejecución.`, chalk.green))
  console.log('')

  let startFrom = options.step ?? steps[0].id
  let stepIndex = steps.findIndex(s => s.id === startFrom)
  if (stepIndex === -1) stepIndex = 0

  const savedContext = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
  let context = savedContext ?? {
    pipelineId: `guide-${Date.now()}`,
    status: 'running' as const,
    currentStep: steps[stepIndex].id,
    completedSteps: [] as string[],
    artifacts: new Map(),
    metadata: { projectName: config.project.name, projectType: config.project.type, guide: true },
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (savedContext?.status === 'paused') {
    const { resume } = await inquirer.prompt([{
      type: 'confirm', name: 'resume', message: 'Hay un pipeline en pausa. ¿Quieres continuar?', default: true,
    }])
    if (!resume) {
      const { restart } = await inquirer.prompt([{
        type: 'confirm', name: 'restart', message: '¿Reiniciar el pipeline desde el principio?', default: false,
      }])
      if (restart) {
        context = {
          pipelineId: `guide-${Date.now()}`,
          status: 'running',
          currentStep: steps[0].id,
          completedSteps: [],
          artifacts: new Map(),
          metadata: { projectName: config.project.name, projectType: config.project.type, guide: true },
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        stepIndex = 0
      } else {
        stepIndex = Math.max(0, steps.findIndex(s => s.id === context.currentStep))
      }
    } else {
      stepIndex = Math.max(0, steps.findIndex(s => s.id === context.currentStep))
    }
  }

  while (stepIndex < steps.length) {
    const step = steps[stepIndex]
    context.currentStep = step.id
    context.status = 'running'
    context.updatedAt = new Date().toISOString()
    saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')

    console.clear()
    console.log(box(`Paso ${stepIndex + 1} de ${steps.length}`, chalk.cyan))
    console.log('')
    console.log(stepExplanation(step))
    console.log('')

    const showMentor = await inquirer.prompt([{
      type: 'confirm', name: 'show', message: '¿Quieres ver la mentoría para este paso?', default: true,
    }])
    if (showMentor.show) {
      console.log('')
      console.log(mentorStep(step.id))
      console.log('')
    }

    const completedBefore = context.completedSteps.includes(step.id) || stepIndex === 0
    if (!completedBefore) {
      const entryChecks = step.entryCriteria ?? []
      if (entryChecks.length > 0) {
        console.log(chalk.yellow('\nCriterios de entrada:'))
        for (const ec of entryChecks) {
          const met = context.completedSteps.some(cs => ec.includes(cs)) || context.artifacts.has(ec)
          console.log(`  ${met ? chalk.green('✓') : chalk.red('✗')} ${ec}`)
        }
        console.log('')
      }
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: `¿Qué quieres hacer con "${step.name}"?`,
      choices: [
        { name: '▶ Ejecutar este paso ahora', value: 'run' },
        { name: '📖 Explicar normas relacionadas', value: 'explain' },
        { name: '⏭ Saltar este paso', value: 'skip' },
        { name: '⏸ Pausar y continuar después', value: 'pause' },
        { name: '📋 Ver progreso del pipeline', value: 'progress' },
        ...(stepIndex < steps.length - 1 ? [{ name: '⏩ Ir al siguiente paso', value: 'next' }] : []),
        ...(stepIndex > 0 ? [{ name: '⏪ Volver al paso anterior', value: 'prev' }] : []),
        { name: '❌ Salir de la guía', value: 'exit' },
      ],
    }])

    switch (action) {
      case 'run': {
        console.log(chalk.cyan(`\n▶ Instrucciones para "${step.name}"\n`))
        const isHumanStep = step.roles.execute.includes('human')
        const isAgentStep = step.roles.execute.some(s => ['opencode', 'claude', 'codex'].includes(s))
        const hasAuto = step.roles.execute.includes('auto')

        if (step.systems && step.systems.length > 0) {
          for (const sys of step.systems) {
            console.log(chalk.bold(`  ${sys.system.toUpperCase()}`))
            if (sys.system === 'human') {
              console.log(chalk.dim(`    ${(sys.config?.instructions as string) ?? step.description}`))
            } else if (sys.system === 'auto') {
              const cmds = sys.config?.commands as string[] ?? []
              for (const c of cmds) console.log(chalk.dim(`    $ ${c}`))
            } else if (sys.config?.prompt) {
              const promptText = sys.config.prompt as string
              console.log(chalk.dim(`    ${promptText.slice(0, 120)}${promptText.length > 120 ? '...' : ''}`))
            }
            console.log('')
          }
        }

        if (isAgentStep || hasAuto) {
          console.log(chalk.yellow('  ═══════════════════════════════════════════════'))
          console.log(chalk.yellow('  Ejecuta en OTRA terminal:'))
          console.log(chalk.white(`    devsteps terminal --command run --step ${step.id}`))
          console.log(chalk.yellow('  O desde la terminal de devSteps:'))
          console.log(chalk.white(`    devsteps run --step ${step.id}`))
          console.log(chalk.yellow('  ═══════════════════════════════════════════════'))
          console.log('')
          console.log(chalk.dim('  El pipeline ejecutará los agentes automáticamente.'))
          console.log(chalk.dim('  Cuando terminen, vuelve aquí y confirma la finalización.'))
          console.log('')
        }

        if (isHumanStep) {
          console.log(chalk.dim('  Completa el trabajo manual requerido y luego confirma.'))
          console.log('')
        }

        const { done } = await inquirer.prompt([{
          type: 'confirm', name: 'done', message: '¿Completaste este paso?', default: false,
        }])
        if (done) {
          context.completedSteps.push(step.id)
          saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')
          console.log(chalk.green(`\n  ✓ Paso "${step.name}" completado`))
        } else {
          console.log(chalk.yellow(`\n  Paso "${step.name}" pendiente. Puedes volver después.`))
        }
        console.log('')
        const { cont } = await inquirer.prompt([{
          type: 'confirm', name: 'cont', message: '¿Continuar al siguiente paso?', default: true,
        }])
        if (cont) { stepIndex++; continue }
        break
      }

      case 'explain': {
        console.log('')
        const normsForStep = DS_V1.norms.filter(n => {
          const stepDesc = (step.description + ' ' + (step.exitCriteria?.join(' ') ?? '')).toLowerCase()
          return stepDesc.includes(n.category) || step.name.toLowerCase().includes(n.category)
        })
        for (const norm of normsForStep.slice(0, 5)) {
          console.log(explainNorm(norm.id))
          console.log('')
        }
        if (normsForStep.length === 0) {
          const allNorms = DS_V1.norms.map(n => ({ name: `${n.id}: ${n.name}`, value: n.id }))
          const { pick } = await inquirer.prompt([{
            type: 'list', name: 'pick', message: 'Elige una norma para ver su explicación:',
            choices: [...allNorms, { name: 'Volver', value: '' }],
          }])
          if (pick) {
            console.log('')
            console.log(explainNorm(pick))
            console.log('')
          }
        }
        const { cont } = await inquirer.prompt([{
          type: 'confirm', name: 'cont', message: '¿Continuar?', default: true,
        }])
        break
      }

      case 'skip': {
        context.completedSteps.push(step.id)
        saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')
        console.log(chalk.yellow(`Paso "${step.id}" omitido.`))
        stepIndex++
        continue
      }

      case 'pause': {
        context.status = 'paused'
        saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')
        console.log(box('Pipeline pausado. Ejecuta "devsteps guide" para continuar.', chalk.yellow))
        return
      }

      case 'progress': {
        console.log('')
        console.log(chalk.bold('Progreso del pipeline:'))
        for (const [i, s] of steps.entries()) {
          const done = context.completedSteps.includes(s.id)
          const current = s.id === context.currentStep
          const icon = done ? chalk.green('✅') : current ? chalk.cyan('🔄') : chalk.dim('⏳')
          console.log(`  ${icon} ${i + 1}. ${s.name}`)
        }
        console.log('')
        const { cont } = await inquirer.prompt([{
          type: 'confirm', name: 'cont', message: '¿Continuar?', default: true,
        }])
        break
      }

      case 'next': {
        stepIndex++
        continue
      }

      case 'prev': {
        stepIndex--
        continue
      }

      case 'exit': {
        context.status = 'paused'
        saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')
        console.log(box('Guía finalizada. Vuelve cuando quieras con "devsteps guide".', chalk.green))
        return
      }
    }
  }

  context.status = 'completed'
  context.updatedAt = new Date().toISOString()
  saveContextToDisk(context as unknown as Record<string, unknown>, root, 'context')

  console.log('')
  console.log(box('🎉 ¡Pipeline completado! \n\n Todos los pasos han sido ejecutados. \n Revisa el reporte final para ver el resumen.', chalk.green))
  console.log('')
  console.log(chalk.bold(`Proyecto: ${config.project.name}`))
  console.log(chalk.dim(`Tipo: ${config.project.type} | Pasos: ${steps.length}`))
  console.log(chalk.cyan('\nSiguientes pasos:'))
  console.log('  • Ejecuta "devsteps validate" para verificar normas DS-v1')
  console.log('  • Ejecuta "devsteps watch" para validación en tiempo real')
  console.log('  • Ejecuta "devsteps dashboard" para ver el panel visual')
}
