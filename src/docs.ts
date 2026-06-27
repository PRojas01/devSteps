import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { loadContextFromDisk } from './engine/checkpoint.js'
import { DS_V1 } from './standard/ds-v1.js'
import { getPipelineForType } from './catalog/pipelines.js'
import type { PipelineContext, StepDefinition } from './types.js'

interface DocsOptions {
  all?: boolean
  readme?: boolean
  architecture?: boolean
  changelog?: boolean
  decision?: string
}

export function generateDocs(root: string, options: DocsOptions): void {
  const config = loadConfig(root)
  if (!config) {
    console.log(chalk.red('No devsteps.yaml found.'))
    return
  }

  const context = loadContextFromDisk(root, 'context') as unknown as PipelineContext | null
  const docsDir = resolve(root, 'docs')
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

  let generated = 0

  if (options.readme || options.all) {
    generateReadme(root, config, context)
    generated++
  }

  if (options.architecture || options.all) {
    generateArchitectureDoc(root, config)
    generated++
  }

  if (options.changelog || options.all) {
    generateChangelog(root, context)
    generated++
  }

  if (options.decision) {
    generateAdr(root, options.decision)
    generated++
  }

  if (!options.all && !options.readme && !options.architecture && !options.changelog && !options.decision) {
    generateAll(root, config, context)
    return
  }

  console.log(chalk.green(`\n  Documentación generada: ${generated} archivos\n`))
}

function generateAll(root: string, config: any, context: PipelineContext | null): void {
  console.log(chalk.bold('\n  📝 devSteps Docs — Generación de documentación\n'))
  console.log(chalk.cyan('Uso:'))
  console.log('  devsteps docs --readme          Generar/actualizar README.md')
  console.log('  devsteps docs --architecture    Generar docs de arquitectura')
  console.log('  devsteps docs --changelog       Generar CHANGELOG.md')
  console.log('  devsteps docs --decision <tema> Generar ADR')
  console.log('  devsteps docs --all             Generar toda la documentación base')
  console.log('')

  generateReadme(root, config, context)
  generateArchitectureDoc(root, config)
  generateChangelog(root, context)

  console.log(chalk.green('\n  Documentación base generada en docs/ y raíz del proyecto\n'))
}

function generateReadme(root: string, config: any, context: PipelineContext | null): void {
  const steps = config.pipeline as StepDefinition[]
  const completedSteps = context?.completedSteps ?? []

  const content = `# ${config.project.name}

${config.project.description || `Proyecto tipo ${config.project.type} gestionado con devSteps.`}

## Stack

${config.project.stack.map((s: string) => `- ${s}`).join('\n')}

## Pipeline Status

${context ? `**Estado:** ${context.status.toUpperCase()}\n**Progreso:** ${completedSteps.length}/${steps.length} pasos completados` : '**Estado:** No iniciado'}

## Pipeline Steps

${steps.map((s, i) => {
  const done = completedSteps.includes(s.id)
  return `${done ? '- [x]' : '- [ ]'} **${s.name}** — ${s.description}`
}).join('\n')}

## Estándar

Este proyecto sigue el estándar **${config.project.standard}** (${DS_V1.norms.length} normas).

## Scripts

| Comando | Descripción |
|---------|-------------|
| \`npm run build\` | Compilar TypeScript |
| \`npm run dev\` | Ejecutar en modo desarrollo |
| \`npm test\` | Ejecutar tests |
| \`npm run lint\` | Lint de código |
| \`devsteps guide\` | Guía interactiva |

## Licencia

MIT
`
  writeFileSync(resolve(root, 'README.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ README.md'))
}

function generateArchitectureDoc(root: string, config: any): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const content = `# Architecture — ${config.project.name}

## Overview

${config.project.description || `Arquitectura para proyecto tipo ${config.project.type}.`}

## Stack

${config.project.stack.map((s: string) => `- ${s}`).join('\n')}

## Estándar

Este proyecto sigue el estándar **${config.project.standard}**.

## Pipeline

El pipeline de desarrollo está definido en \`devsteps.yaml\` con ${config.pipeline.length} pasos:

${config.pipeline.map((s: any) => `- **${s.name}**: ${s.description}`).join('\n')}

## Normas Aplicables

${DS_V1.norms.filter(n => n.severity === 'error').map(n => `- **${n.id}** (${n.category}): ${n.description}`).join('\n')}

## Decisiones

Las decisiones de arquitectura se documentan como ADRs en \`docs/adr-*.md\`.
`
  writeFileSync(resolve(dir, 'architecture.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ docs/architecture.md'))
}

function generateChangelog(root: string, context: PipelineContext | null): void {
  const path = resolve(root, 'CHANGELOG.md')
  let existing = ''
  if (existsSync(path)) {
    existing = readFileSync(path, 'utf-8')
  }

  const version = '0.1.0'
  const date = new Date().toISOString().split('T')[0]
  const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [${version}] - ${date}
`

  if (context) {
    const completedSteps = context.completedSteps
    const steps = completedSteps.length > 0
      ? completedSteps.map(s => `- ${s} completado`).join('\n')
      : '- Proyecto inicializado con devSteps'
    const content = header + `\n### Added\n\n${steps}\n`

    if (existing && existing.includes('## [')) {
      writeFileSync(path, content, 'utf-8')
    } else {
      writeFileSync(path, content, 'utf-8')
    }
  } else {
    const content = header + '\n### Added\n\n- Proyecto inicializado con devSteps\n'
    writeFileSync(path, content, 'utf-8')
  }

  console.log(chalk.green('  ✓ CHANGELOG.md'))
}

function generateAdr(root: string, title: string): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const date = new Date().toISOString().split('T')[0]
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const adrs = existsSync(dir)
    ? readFileSync(dir, 'utf-8')
    : ''
  const adrCount = (adrs.match(/ADR-\d+/g) ?? []).length
  const adrNum = adrCount + 1

  const content = `# ADR-${String(adrNum).padStart(3, '0')}: ${title}

**Status:** Proposed
**Date:** ${date}

## Context

Explica el contexto y la motivación para esta decisión.

## Decision

Describe la decisión tomada.

## Consequences

Describe las consecuencias de esta decisión.

## Alternatives Considered

- Alternative 1: (reason not chosen)
- Alternative 2: (reason not chosen)
`

  const filename = `adr-${String(adrNum).padStart(3, '0')}-${slug}.md`
  writeFileSync(resolve(dir, filename), content, 'utf-8')
  console.log(chalk.green(`  ✓ docs/${filename}`))
}
