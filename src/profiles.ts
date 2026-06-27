import chalk from 'chalk'
import type { StepDefinition, ProjectType } from './types.js'
import { loadConfig } from './config.js'
import { loadContextFromDisk } from './engine/checkpoint.js'
import type { PipelineContext } from './types.js'
import { getPipelineForType } from './catalog/pipelines.js'

interface ProfileOptions {
  profile: string
  type?: ProjectType
}

type RoleProfile = 'dev' | 'lead' | 'devops' | 'pm'

interface ProfileView {
  label: string
  icon: string
  description: string
  filterSteps: (steps: StepDefinition[]) => StepDefinition[]
  columns: string[]
}

const PROFILES: Record<RoleProfile, ProfileView> = {
  dev: {
    label: 'Developer',
    icon: '👨‍💻',
    description: 'Enfocado en implementación, tests, y calidad de código',
    filterSteps: (steps) => steps.filter(s =>
      ['4-develop', '5-verify', '7-maintain'].includes(s.id) ||
      s.roles.execute.includes('opencode') ||
      s.roles.execute.includes('auto')
    ),
    columns: ['Paso', 'Sistemas', 'Output', 'Criterios salida'],
  },
  lead: {
    label: 'Tech Lead',
    icon: '👓',
    description: 'Visión completa del pipeline: diseño, revisión, y gobernanza',
    filterSteps: (steps) => steps,
    columns: ['Paso', 'Sistemas', 'Gobernanza', 'Duración'],
  },
  devops: {
    label: 'DevOps',
    icon: '🔧',
    description: 'Enfoque en CI/CD, releases, infraestructura, y calidad',
    filterSteps: (steps) => steps.filter(s =>
      ['3-init', '5-verify', '6-release', '7-maintain'].includes(s.id)
    ),
    columns: ['Paso', 'Comandos', 'Output', 'Duración'],
  },
  pm: {
    label: 'Project Manager',
    icon: '📊',
    description: 'Resumen ejecutivo: tiempos, estado, riesgos, y entregables',
    filterSteps: (steps) => steps,
    columns: ['Paso', 'Estado', 'Duración', 'Entregables'],
  },
}

export function runProfile(root: string, options: ProfileOptions): void {
  const profileId = options.profile as RoleProfile
  const profile = PROFILES[profileId]

  if (!profile) {
    console.log(chalk.red(`Perfil "${options.profile}" no válido.`))
    console.log(chalk.dim('Perfiles disponibles:'))
    for (const [id, p] of Object.entries(PROFILES)) {
      console.log(chalk.dim(`  ${p.icon} ${id.padEnd(8)} ${p.label} — ${p.description}`))
    }
    return
  }

  const config = loadConfig(root)
  if (!config) {
    console.log(chalk.red('No devsteps.yaml found.'))
    return
  }

  const context = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
  const steps = profile.filterSteps(config.pipeline)

  console.log('')
  console.log(chalk.bold(`  ${profile.icon} ${profile.label} — ${profile.description}`))
  console.log('')

  const headerLine = profile.columns.map(c => chalk.bold(c.padEnd(20))).join('')
  console.log(`  ${headerLine}`)
  console.log(chalk.dim(`  ${'─'.repeat(headerLine.length)}`))

  for (const step of steps) {
    const isDone = context?.completedSteps.includes(step.id)
    const isCurrent = context?.currentStep === step.id
    const icon = isDone ? chalk.green('✓') : isCurrent ? chalk.cyan('→') : chalk.dim('·')

    if (profileId === 'dev') {
      const systems = step.roles.execute.join(',')
      const output = (step.output ?? []).join(',') || '—'
      const exit = (step.exitCriteria ?? []).join(',') || '—'
      console.log(`  ${icon} ${chalk.bold(step.name.padEnd(18))} ${systems.padEnd(20)} ${output.slice(0, 18).padEnd(20)} ${exit.slice(0, 18)}`)
    } else if (profileId === 'lead') {
      const systems = step.roles.execute.join(',')
      const gov = (step.roles.governance ?? []).join(',') || '—'
      const dur = step.estimatedDuration ?? '—'
      console.log(`  ${icon} ${chalk.bold(step.name.padEnd(18))} ${systems.padEnd(20)} ${gov.padEnd(20)} ${dur}`)
    } else if (profileId === 'devops') {
      const cmds = step.systems?.filter(s => s.system === 'auto').flatMap(s => (s.config?.commands as string[]) ?? []).join('; ') || '—'
      const output = (step.output ?? []).join(',') || '—'
      const dur = step.estimatedDuration ?? '—'
      console.log(`  ${icon} ${chalk.bold(step.name.padEnd(18))} ${cmds.slice(0, 18).padEnd(20)} ${output.slice(0, 18).padEnd(20)} ${dur}`)
    } else {
      const status = isDone ? chalk.green('Completado') : isCurrent ? chalk.cyan('En curso') : chalk.dim('Pendiente')
      const dur = step.estimatedDuration ?? '—'
      const deliverables = (step.output ?? []).join(',') || '—'
      console.log(`  ${icon} ${chalk.bold(step.name.padEnd(18))} ${status.padEnd(15)} ${dur.padEnd(15)} ${deliverables.slice(0, 18)}`)
    }
  }

  if (profileId === 'pm') {
    console.log('')
    console.log(chalk.bold('  Resumen:'))
    const total = config.pipeline.length
    const completed = context?.completedSteps.length ?? 0
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const bar = chalk.green('█'.repeat(Math.round(pct / 5))) + chalk.dim('░'.repeat(20 - Math.round(pct / 5)))
    console.log(`  Progreso: ${bar} ${pct}% (${completed}/${total})`)
    console.log(`  Artefactos: ${context?.artifacts.size ?? 0}`)
    console.log(`  Estado: ${context?.status ?? 'no iniciado'}`)
  }

  console.log('')
}

export function listProfiles(): void {
  console.log(chalk.bold('\n  Perfiles disponibles:'))
  console.log('')
  for (const [id, p] of Object.entries(PROFILES)) {
    console.log(`  ${p.icon} ${chalk.bold(id)}`)
    console.log(`     ${p.label} — ${p.description}`)
    console.log('')
  }
}
