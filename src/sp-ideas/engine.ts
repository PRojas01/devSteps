/** SP-Ideas engine: register, evaluate, prioritize, approve ideas. Stores in .devsteps/ideas/ */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import type { Idea, IdeaCategory, IdeaStatus, Effort, ViabilityResult, Stats } from './types.js'

const STORAGE_DIR = '.devsteps/ideas'
const WORKSPACE: string = process.env.DEVSTEPS_WORKSPACE
  || resolve(process.env.HOME ?? '/home', 'PROYECTOS_PROGRAMACION')

function dataDir(root: string): string {
  const d = resolve(root, STORAGE_DIR)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function ideaPath(root: string, id: string): string {
  return resolve(dataDir(root), `${id}.json`)
}

function indexPath(root: string): string {
  return resolve(dataDir(root), 'index.json')
}

function loadIds(root: string): string[] {
  const p = indexPath(root)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : []
}

function saveIds(root: string, ids: string[]): void {
  writeFileSync(indexPath(root), JSON.stringify(ids, null, 2))
}

function newId(): string {
  return `IDEA-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createIdea(
  root: string,
  data: { title: string; description: string; category: IdeaCategory; problem: string; audience: string; impact: string; effort: Effort; tags?: string[]; priority?: string },
): Idea {
  const now = new Date().toISOString()
  const idea: Idea = {
    id: newId(), title: data.title, description: data.description,
    category: data.category, problem: data.problem, audience: data.audience,
    impact: data.impact, effort: data.effort, status: 'draft',
    priority: (data.priority ?? 'medium') as Idea['priority'], tags: data.tags ?? [],
    score: 0, notes: [], createdAt: now, updatedAt: now,
  }
  writeFileSync(ideaPath(root, idea.id), JSON.stringify(idea, null, 2))
  const ids = loadIds(root); ids.push(idea.id); saveIds(root, ids)
  return idea
}

export function getIdea(root: string, id: string): Idea | null {
  const p = ideaPath(root, id)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null
}

export function listIdeas(root: string): Idea[] {
  return loadIds(root).map(id => getIdea(root, id)).filter(Boolean) as Idea[]
}

export function updateIdea(root: string, idea: Idea): void {
  idea.updatedAt = new Date().toISOString()
  writeFileSync(ideaPath(root, idea.id), JSON.stringify(idea, null, 2))
}

export function evaluateIdea(root: string, id: string, scores: number[]): { idea: Idea | null; result: ViabilityResult } | null {
  const idea = getIdea(root, id)
  if (!idea) return null
  const [t, e, tmp, r] = scores
  const weighted = t * 0.3 + e * 0.3 + tmp * 0.2 + r * 0.2
  const verdict: 'GO' | 'ITERATE' | 'KILL' = weighted >= 4.0 ? 'GO' : weighted >= 2.5 ? 'ITERATE' : 'KILL'
  const result: ViabilityResult = { weighted: Math.round(weighted * 100) / 100, verdict, technical: t, economic: e, temporal: tmp, risk: r }
  idea.viability = result
  idea.score = Math.round((idea.effort === 'small' ? 5 : idea.effort === 'medium' ? 4 : idea.effort === 'large' ? 3 : 2) * weighted * 10) / 10
  idea.status = 'evaluated'
  updateIdea(root, idea)
  return { idea, result }
}

export function prioritizeIdeas(root: string): Idea[] {
  const ideas = listIdeas(root).filter(i => i.status !== 'rejected' && i.status !== 'archived')
  ideas.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return ideas
}

const PIPELINE_TEMPLATE = [
  { id: '1-validate-idea', name: 'Validar Idea', description: 'Evaluación multi-agente de la idea', roles: { execute: ['opencode', 'claude', 'codex'], approve: 'human' }, entryCriteria: ['Idea definida'], exitCriteria: ['decision.md:exists'], next: { onSuccess: '2-design', onFailure: 'retry', onPartial: 'review' }, output: ['decision.md'], estimatedDuration: '1-2h' },
  { id: '2-design', name: 'Diseñar', description: 'Diseño de la solución: requisitos, arquitectura, ADRs', roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] }, entryCriteria: ['decision.md:exists'], exitCriteria: ['docs/requirements.md:exists', 'docs/architecture.md:exists'], next: { onSuccess: '3-init', onFailure: 'retry', onPartial: 'review' }, output: ['docs/'], estimatedDuration: '2-4h' },
  { id: '3-init', name: 'Inicializar', description: 'Scaffolding del proyecto', roles: { execute: ['opencode'], approve: 'human' }, entryCriteria: ['docs/architecture.md:exists'], exitCriteria: ['package.json:exists'], next: { onSuccess: '4-develop', onFailure: 'retry', onPartial: 'retry' }, output: ['package.json'], estimatedDuration: '30min' },
  { id: '4-develop', name: 'Desarrollar', description: 'Desarrollo con gobernanza DevControl', roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] }, maxIterations: 10, entryCriteria: ['package.json:exists'], exitCriteria: [], next: { onSuccess: '5-verify', onFailure: 'retry', onPartial: 'review' }, output: ['src/'], estimatedDuration: 'días' },
  { id: '5-verify', name: 'Verificar', description: 'Quality gates: typecheck, lint, tests', roles: { execute: ['auto', 'opencode'], approve: 'human' }, entryCriteria: [], exitCriteria: [], next: { onSuccess: '6-release', onFailure: 'retry', onPartial: 'review' }, output: [], estimatedDuration: '1h' },
  { id: '6-release', name: 'Release', description: 'Versionado, changelog, build', roles: { execute: ['auto', 'human'], approve: 'human' }, entryCriteria: [], exitCriteria: [], next: { onSuccess: '7-maintain', onFailure: 'retry', onPartial: 'review' }, output: [], estimatedDuration: '30min' },
  { id: '7-maintain', name: 'Mantener', description: 'Ciclo de mantenimiento perpetuo', roles: { execute: ['opencode'], approve: 'human', governance: ['devcontrol'] }, maxIterations: 999, entryCriteria: [], exitCriteria: [], next: { onSuccess: '7-maintain', onFailure: 'retry', onPartial: 'review' }, output: [], estimatedDuration: 'indefinido' },
]

export function approveIdea(root: string, id: string, projectName?: string): Idea | null {
  const idea = getIdea(root, id)
  if (!idea) return null

  const projName = (projectName ?? idea.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const projDir = resolve(WORKSPACE, projName)

  if (!existsSync(projDir)) {
    mkdirSync(projDir, { recursive: true })
    mkdirSync(resolve(projDir, '.devsteps'), { recursive: true })

    const stack = (idea.tags.length > 0 ? idea.tags : ['typescript', 'node']).map((t: string) => `"${t}"`).join(', ')
    const stepsYaml = PIPELINE_TEMPLATE.map((s: Record<string, unknown>) => {
      const roles = s.roles as { execute: string[]; approve: string; governance?: string[] }
      const next = s.next as { onSuccess: string; onFailure: string; onFailureTarget?: string; onPartial: string }
      return `  - id: ${s.id}
    name: "${s.name}"
    description: "${(s.description as string).replace(/"/g, '\\"')}"
    roles:
      execute: [${roles.execute.map((t: string) => `"${t}"`).join(', ')}]
      approve: ${roles.approve}${roles.governance ? `\n      governance: [${roles.governance.map((t: string) => `"${t}"`).join(', ')}]` : ''}
    entryCriteria: [${(s.entryCriteria as string[]).map((c: string) => `"${c}"`).join(', ')}]
    exitCriteria: [${(s.exitCriteria as string[]).map((c: string) => `"${c}"`).join(', ')}]
    next:
      onSuccess: ${next.onSuccess}
      onFailure: ${next.onFailure}${next.onFailureTarget ? `\n      onFailureTarget: ${next.onFailureTarget}` : ''}
      onPartial: ${next.onPartial}
    output: [${(s.output as string[]).map((o: string) => `"${o}"`).join(', ')}]
    estimatedDuration: "${s.estimatedDuration as string}"`
    }).join('\n')

    const yaml = `project:
  name: ${projName}
  type: cli-tool
  version: 0.1.0
  description: "${idea.description.replace(/"/g, '\\"')}"
  stack: [${stack}]
  standard: ds-v1
pipeline:
${stepsYaml}
standard: ds-v1
`
    writeFileSync(resolve(projDir, 'devsteps.yaml'), yaml, 'utf-8')
  }

  idea.status = 'accepted'
  idea.acceptedAt = new Date().toISOString()
  idea.projectName = projName
  idea.notes.push(`Proyecto creado en: ${projDir}`)
  updateIdea(root, idea)
  return idea
}

export function rejectIdea(root: string, id: string, reason?: string): Idea | null {
  const idea = getIdea(root, id)
  if (!idea) return null
  idea.status = 'rejected'
  if (reason) idea.notes.push(`Rejected: ${reason}`)
  updateIdea(root, idea)
  return idea
}

export function getStats(root: string): Stats {
  const ideas = listIdeas(root)
  const byStatus: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  for (const i of ideas) {
    byStatus[i.status] = (byStatus[i.status] ?? 0) + 1
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1
  }
  const scored = ideas.filter(i => i.score > 0)
  return {
    total: ideas.length,
    accepted: ideas.filter(i => i.status === 'accepted').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
    pending: ideas.filter(i => i.status === 'draft' || i.status === 'submitted').length,
    avgScore: scored.length > 0 ? Math.round((scored.reduce((s, i) => s + i.score, 0) / scored.length) * 10) / 10 : 0,
    byStatus, byCategory,
  }
}
