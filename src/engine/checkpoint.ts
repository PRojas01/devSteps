/** Module purpose: supports devSteps checkpoint functionality. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import type { Checkpoint } from '../types.js'

const CHECKPOINT_DIR = '.devsteps/checkpoints'

export function saveCheckpointToDisk(cp: Checkpoint, projectRoot: string): string {
  const dir = resolve(projectRoot, CHECKPOINT_DIR)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const filePath = resolve(dir, `${cp.id}.json`)
  writeFileSync(filePath, JSON.stringify(cp, null, 2), 'utf-8')
  return filePath
}

export function loadCheckpointFromDisk(id: string, projectRoot: string): Checkpoint | null {
  const filePath = resolve(projectRoot, CHECKPOINT_DIR, `${id}.json`)
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

export function listCheckpoints(projectRoot: string): string[] {
  const dir = resolve(projectRoot, CHECKPOINT_DIR)
  if (!existsSync(dir)) return []
  return readFileSync(dir, 'utf-8')
    .split('\n')
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

export function saveContextToDisk(context: Record<string, unknown>, projectRoot: string, name: string): string {
  const dir = resolve(projectRoot, '.devsteps')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const filePath = resolve(dir, `${name}.json`)
  writeFileSync(filePath, JSON.stringify(context, null, 2), 'utf-8')
  return filePath
}

export function loadContextFromDisk(projectRoot: string, name: string): Record<string, unknown> | null {
  const filePath = resolve(projectRoot, '.devsteps', `${name}.json`)
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}
