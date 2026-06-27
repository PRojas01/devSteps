/** SP-Ideas CLI commands: new, list, view, evaluate, prioritize, approve, reject, stats */
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createIdea, getIdea, listIdeas, evaluateIdea, prioritizeIdeas, approveIdea, rejectIdea, getStats } from './engine.js'
import type { IdeaCategory, Effort, Priority } from './types.js'

const CATEGORIES: { name: string; value: IdeaCategory }[] = [
  { name: 'Nuevo producto', value: 'product' },
  { name: 'Nueva funcionalidad', value: 'feature' },
  { name: 'Mejora', value: 'improvement' },
  { name: 'Corrección', value: 'bugfix' },
  { name: 'Investigación', value: 'research' },
  { name: 'Infraestructura', value: 'infrastructure' },
  { name: 'Otro', value: 'other' },
]

const EFFORTS: { name: string; value: Effort }[] = [
  { name: 'Pequeño (días)', value: 'small' },
  { name: 'Mediano (semanas)', value: 'medium' },
  { name: 'Grande (meses)', value: 'large' },
  { name: 'Muy grande (trimestres+)', value: 'xlarge' },
]

const PRIORITIES: { name: string; value: Priority }[] = [
  { name: 'Urgente', value: 'urgent' },
  { name: 'Alta', value: 'high' },
  { name: 'Media', value: 'medium' },
  { name: 'Baja', value: 'low' },
  { name: 'Backlog', value: 'backlog' },
]

export async function cmdNew(root: string): Promise<void> {
  process.stdout.write(chalk.bold('\n  📝 Registrar nueva idea\n\n'))

  const answers = await inquirer.prompt([
    { type: 'input', name: 'title', message: 'Título de la idea:', validate: (v: string) => v.length > 0 || 'Requerido' },
    { type: 'input', name: 'description', message: 'Descripción:', validate: (v: string) => v.length > 0 || 'Requerido' },
    { type: 'list', name: 'category', message: 'Categoría:', choices: CATEGORIES },
    { type: 'input', name: 'problem', message: 'Problema que resuelve:' },
    { type: 'input', name: 'audience', message: 'Audiencia objetivo:' },
    { type: 'input', name: 'impact', message: 'Impacto esperado:' },
    { type: 'list', name: 'effort', message: 'Esfuerzo estimado:', choices: EFFORTS },
    { type: 'list', name: 'priority', message: 'Prioridad:', choices: PRIORITIES, default: 'medium' },
    { type: 'input', name: 'tags', message: 'Tags (separados por coma):', default: '' },
  ])

  const idea = createIdea(root, {
    title: answers.title, description: answers.description, category: answers.category,
    problem: answers.problem, audience: answers.audience, impact: answers.impact,
    effort: answers.effort, priority: answers.priority,
    tags: answers.tags ? (answers.tags as string).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
  })

  process.stdout.write(chalk.green(`\n  ✅ Idea registrada: ${idea.id}\n`))
  process.stdout.write(chalk.dim(`  Título: ${idea.title}\n`))
  process.stdout.write(chalk.dim(`  Estado: ${idea.status}\n\n`))
}

export function cmdList(root: string): void {
  const ideas = listIdeas(root)
  if (ideas.length === 0) {
    process.stdout.write(chalk.yellow('\n  No hay ideas registradas. Usa "devsteps ideas new".\n\n'))
    return
  }

  process.stdout.write(chalk.bold(`\n  📋 Ideas registradas (${ideas.length})\n\n`))
  const statusIcons: Record<string, string> = { draft: '📄', submitted: '📨', evaluated: '📊', accepted: '✅', rejected: '❌', archived: '📦' }

  for (const idea of ideas) {
    const icon = statusIcons[idea.status] ?? '❓'
    const prioColor: Record<string, (s: string) => string> = { urgent: chalk.red, high: chalk.yellow, medium: chalk.green, low: chalk.blue, backlog: chalk.dim }
    const score = idea.score > 0 ? chalk.yellow(` [${idea.score}pts]`) : ''
    const verdict = idea.viability ? (idea.viability.verdict === 'GO' ? chalk.green(' GO') : idea.viability.verdict === 'ITERATE' ? chalk.yellow(' ITERATE') : chalk.red(' KILL')) : ''
    process.stdout.write(`  ${icon} ${chalk.bold(idea.title.padEnd(35))} ${(prioColor[idea.priority] ?? chalk.dim)(idea.priority.padEnd(8))}${score}${verdict}\n`)
    process.stdout.write(chalk.dim(`     ${idea.id} · ${idea.category} · ${idea.effort} · ${idea.status}\n`))
  }
  process.stdout.write('\n')
}

export function cmdView(root: string, id: string): void {
  const idea = getIdea(root, id)
  if (!idea) { process.stdout.write(chalk.red(`\n  Idea "${id}" no encontrada.\n\n`)); return }

  const statusColors: Record<string, (s: string) => string> = { draft: chalk.dim, submitted: chalk.blue, evaluated: chalk.cyan, accepted: chalk.green, rejected: chalk.red, archived: chalk.dim }

  process.stdout.write(chalk.bold(`\n  📋 ${idea.id}: ${idea.title}\n\n`))
  process.stdout.write(`  ${chalk.bold('Descripción:')}  ${idea.description}\n`)
  process.stdout.write(`  ${chalk.bold('Estado:')}       ${(statusColors[idea.status] ?? chalk.dim)(idea.status)}\n`)
  process.stdout.write(`  ${chalk.bold('Prioridad:')}     ${idea.priority}\n`)
  process.stdout.write(`  ${chalk.bold('Categoría:')}     ${idea.category}\n`)
  process.stdout.write(`  ${chalk.bold('Esfuerzo:')}      ${idea.effort}\n`)
  process.stdout.write(`  ${chalk.bold('Tags:')}          ${idea.tags.join(', ') || '—'}\n`)
  process.stdout.write(`  ${chalk.bold('Creada:')}        ${new Date(idea.createdAt).toLocaleString()}\n\n`)
  process.stdout.write(`  ${chalk.bold('Problema:')}      ${idea.problem || '—'}\n`)
  process.stdout.write(`  ${chalk.bold('Audiencia:')}     ${idea.audience || '—'}\n`)
  process.stdout.write(`  ${chalk.bold('Impacto:')}       ${idea.impact || '—'}\n`)

  if (idea.viability) {
    process.stdout.write(`\n${chalk.bold('  Viabilidad:')}\n`)
    process.stdout.write(`  Ponderado: ${idea.viability.weighted}/5.0 | Veredicto: ${idea.viability.verdict}\n`)
    process.stdout.write(`  Técnico: ${idea.viability.technical} · Económico: ${idea.viability.economic} · Temporal: ${idea.viability.temporal} · Riesgo: ${idea.viability.risk}\n`)
  }
  if (idea.notes.length > 0) {
    process.stdout.write(`\n${chalk.bold('  Notas:')}\n`)
    for (const n of idea.notes) process.stdout.write(`  • ${n}\n`)
  }
  if (idea.projectName) process.stdout.write(`\n${chalk.green(`  → Proyecto: ${idea.projectName}`)}\n`)
  process.stdout.write('\n')
}

export async function cmdEvaluate(root: string, id: string): Promise<void> {
  const idea = getIdea(root, id)
  if (!idea) { process.stdout.write(chalk.red(`\n  Idea "${id}" no encontrada.\n\n`)); return }

  process.stdout.write(chalk.bold(`\n  📊 Evaluar: ${idea.title}\n\n`))

  const answers = await inquirer.prompt([
    { type: 'number', name: 'technical', message: 'Stack técnico conocido? (1-5):', default: 3, validate: (v: number) => v >= 1 && v <= 5 },
    { type: 'number', name: 'economic', message: 'Retorno vs inversión? (1-5):', default: 3, validate: (v: number) => v >= 1 && v <= 5 },
    { type: 'number', name: 'temporal', message: 'Deadline realista? (1-5):', default: 3, validate: (v: number) => v >= 1 && v <= 5 },
    { type: 'number', name: 'risk', message: 'Riesgo manejable? (1-5):', default: 3, validate: (v: number) => v >= 1 && v <= 5 },
  ])

  const result = evaluateIdea(root, id, [answers.technical, answers.economic, answers.temporal, answers.risk])
  if (!result) { process.stdout.write(chalk.red('Error evaluando idea\n')); return }

  process.stdout.write(`\n  Técnico:    ${'█'.repeat(Math.round(result.result.technical))}${'░'.repeat(5 - Math.round(result.result.technical))} ${result.result.technical}/5\n`)
  process.stdout.write(`  Económico:  ${'█'.repeat(Math.round(result.result.economic))}${'░'.repeat(5 - Math.round(result.result.economic))} ${result.result.economic}/5\n`)
  process.stdout.write(`  Temporal:   ${'█'.repeat(Math.round(result.result.temporal))}${'░'.repeat(5 - Math.round(result.result.temporal))} ${result.result.temporal}/5\n`)
  process.stdout.write(`  Riesgo:     ${'█'.repeat(Math.round(result.result.risk))}${'░'.repeat(5 - Math.round(result.result.risk))} ${result.result.risk}/5\n`)
  const vColor = result.result.verdict === 'GO' ? chalk.green : result.result.verdict === 'ITERATE' ? chalk.yellow : chalk.red
  process.stdout.write(`\n  Ponderado: ${chalk.bold(result.result.weighted.toString())}/5.0 → ${vColor(result.result.verdict)}\n\n`)
}

export function cmdPrioritize(root: string): void {
  const ranked = prioritizeIdeas(root)
  if (ranked.length === 0) { process.stdout.write(chalk.yellow('\n  No hay ideas para priorizar.\n\n')); return }

  process.stdout.write(chalk.bold(`\n  📊 Priorización de ideas (${ranked.length})\n\n`))
  for (const [i, idea] of ranked.entries()) {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
    const v = idea.viability?.verdict === 'GO' ? chalk.green('GO') : idea.viability?.verdict === 'ITERATE' ? chalk.yellow('ITERATE') : chalk.dim('—')
    process.stdout.write(`  ${medal} ${chalk.bold(idea.title.padEnd(35))} ${chalk.yellow(`${idea.score}pts`).padEnd(10)} ${v}  ${idea.effort}\n`)
  }
  process.stdout.write('\n')
}

export async function cmdApprove(root: string, id: string): Promise<void> {
  const idea = getIdea(root, id)
  if (!idea) { process.stdout.write(chalk.red(`\n  Idea "${id}" no encontrada.\n\n`)); return }

  const { name } = await inquirer.prompt([{
    type: 'input', name: 'name', message: 'Nombre del proyecto:', default: idea.title.toLowerCase().replace(/\s+/g, '-'),
  }])

  const result = approveIdea(root, id, name)
  if (result) {
    process.stdout.write(chalk.green(`\n  ✅ Idea aceptada como proyecto "${name}"\n`))
    process.stdout.write(chalk.cyan('  Para continuar con devSteps:\n'))
    process.stdout.write(chalk.white(`    cd ${name}\n`))
    process.stdout.write(chalk.white(`    devsteps scaffold --name "${name}" --force\n`))
    process.stdout.write(chalk.white(`    devsteps guide\n\n`))
  }
}

export function cmdReject(root: string, id: string): void {
  const idea = getIdea(root, id)
  if (!idea) { process.stdout.write(chalk.red(`\n  Idea "${id}" no encontrada.\n\n`)); return }
  rejectIdea(root, id, 'Rechazada por el usuario')
  process.stdout.write(chalk.red(`\n  ✗ Idea "${idea.title}" rechazada.\n\n`))
}

export function cmdStats(root: string): void {
  const stats = getStats(root)
  process.stdout.write(chalk.bold('\n  📊 SP-Ideas — Estadísticas\n\n'))
  process.stdout.write(`  ${chalk.bold('Total ideas:')}    ${stats.total}\n`)
  process.stdout.write(`  ${chalk.green('Aceptadas:')}      ${stats.accepted}\n`)
  process.stdout.write(`  ${chalk.red('Rechazadas:')}     ${stats.rejected}\n`)
  process.stdout.write(`  ${chalk.yellow('Pendientes:')}     ${stats.pending}\n`)
  process.stdout.write(`  Puntaje promedio: ${stats.avgScore}\n\n`)
  if (Object.keys(stats.byStatus).length > 0) {
    process.stdout.write(chalk.bold('  Por estado:\n'))
    for (const [k, v] of Object.entries(stats.byStatus)) process.stdout.write(`  ${k.padEnd(12)} ${v}\n`)
  }
  if (Object.keys(stats.byCategory).length > 0) {
    process.stdout.write(`\n${chalk.bold('  Por categoría:\n')}`)
    for (const [k, v] of Object.entries(stats.byCategory)) process.stdout.write(`  ${k.padEnd(16)} ${v}\n`)
  }
  process.stdout.write('\n')
}
