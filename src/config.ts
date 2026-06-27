import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { load, dump } from 'js-yaml'
import type { DevStepsConfig, ProjectType } from './types.js'
import { getConfigFilePath, getDevstepsDir } from './utils/paths.js'
import { getPipelineForType } from './catalog/pipelines.js'

export function loadConfig(projectRoot: string): DevStepsConfig | null {
  const filePath = getConfigFilePath(projectRoot)
  if (!existsSync(filePath)) return null

  const raw = readFileSync(filePath, 'utf-8')
  return load(raw) as DevStepsConfig
}

export function saveConfig(config: DevStepsConfig, projectRoot: string): void {
  const dir = getDevstepsDir(projectRoot)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const yaml = dump(config, { indent: 2, lineWidth: 120, quotingType: '"', forceQuotes: false })
  writeFileSync(getConfigFilePath(projectRoot), yaml, 'utf-8')
}

export function createDefaultConfig(
  name: string, type: ProjectType, description: string, stack: string[],
): DevStepsConfig {
  const pipeline = getPipelineForType(type)

  return {
    project: {
      name,
      type,
      version: '0.1.0',
      description,
      stack,
      standard: 'ds-v1',
    },
    pipeline: pipeline.steps,
    standard: 'ds-v1',
  }
}



export function configExists(projectRoot: string): boolean {
  return existsSync(getConfigFilePath(projectRoot))
}
