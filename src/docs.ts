/** Module purpose: supports devSteps docs functionality. */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { loadContextFromDisk } from './engine/checkpoint.js'
import { DS_V1 } from './standard/ds-v1.js'
import type { DevStepsConfig, PipelineContext, StepDefinition } from './types.js'

interface DocsOptions {
  all?: boolean
  readme?: boolean
  requirements?: boolean
  architecture?: boolean
  gettingStarted?: boolean
  publishing?: boolean
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

  if (options.requirements || options.all) {
    generateRequirementsDoc(root, config)
    generated++
  }

  if (options.architecture || options.all) {
    generateArchitectureDoc(root, config)
    generated++
  }

  if (options.gettingStarted || options.all) {
    generateGettingStartedDoc(root, config)
    generated++
  }

  if (options.publishing || options.all) {
    generatePublishingDoc(root, config)
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

  if (!options.all && !options.readme && !options.requirements && !options.architecture && !options.gettingStarted && !options.publishing && !options.changelog && !options.decision) {
    generateAll(root, config, context)
    return
  }

  console.log(chalk.green(`\n  Documentación generada: ${generated} archivos\n`))
}

function generateAll(root: string, config: DevStepsConfig, context: PipelineContext | null): void {
  console.log(chalk.bold('\n  📝 devSteps Docs — Generación de documentación\n'))
  console.log(chalk.cyan('Uso:'))
  console.log('  devsteps docs --readme          Generar/actualizar README.md')
  console.log('  devsteps docs --requirements    Generar docs/requirements.md')
  console.log('  devsteps docs --architecture    Generar docs de arquitectura')
  console.log('  devsteps docs --getting-started Generar guía paso a paso para principiantes')
  console.log('  devsteps docs --publishing      Generar guía de publicación')
  console.log('  devsteps docs --changelog       Generar CHANGELOG.md')
  console.log('  devsteps docs --decision <tema> Generar ADR')
  console.log('  devsteps docs --all             Generar toda la documentación base')
  console.log('')

  generateReadme(root, config, context)
  generateRequirementsDoc(root, config)
  generateArchitectureDoc(root, config)
  generateGettingStartedDoc(root, config)
  generatePublishingDoc(root, config)
  generateChangelog(root, context)

  console.log(chalk.green('\n  Documentación base generada en docs/ y raíz del proyecto\n'))
}

function generateReadme(root: string, config: DevStepsConfig, context: PipelineContext | null): void {
  const steps = config.pipeline as StepDefinition[]
  const completedSteps = context?.completedSteps ?? []
  const installCommand = 'npm install -g sp-devsteps'

  const content = `# ${config.project.name}

${config.project.description || 'Orquestador de proyectos por etapas, pensado para personas que empiezan desde cero y quieren apoyarse en agentes como Codex, Claude Code u OpenCode sin perder control del proceso.'}

## Que resuelve

- Convierte una idea en un proyecto ejecutable usando un pipeline visible y auditable.
- Enseña el flujo paso a paso: idea, diseño, inicialización, desarrollo, verificación, release y mantenimiento.
- Permite trabajar en tres superficies principales:
  - CLI instalable para uso local y automatización.
  - Skill/instrucciones inyectables para agentes y editores.
  - Configuración de integración para extensiones y entornos MCP.

## Perfil objetivo

Personas que están empezando a desarrollar proyectos y también a trabajar con editores agénticos. La prioridad es claridad operativa antes que automatización opaca.

## Instalación rápida del CLI

### Opción 1: usar la herramienta en cualquier proyecto

\`\`\`bash
${installCommand}
\`\`\`

Después podrás usar:

\`\`\`bash
devsteps --help
\`\`\`

### Opción 2: contribuir a devSteps desde este repositorio

\`\`\`bash
npm install
npm run build
npm test
npm link
\`\`\`

## Primer recorrido recomendado

1. Crea una carpeta para tu proyecto.
2. Genera la base con \`devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force\`.
3. Sigue la guía para principiantes con \`devsteps guide\`.
4. Inyecta reglas para agentes con \`devsteps inject\`.
5. Si usas DevControl, ejecuta \`sp-devcontrol inject\` y \`sp-devcontrol project:check\`.
6. Valida el estado del proyecto con \`devsteps validate\`.
7. Instala dependencias del proyecto generado con \`npm install\`, luego ejecuta \`npm run build\` y \`npm test\`.

## Tres modos de trabajo

### 1. CLI instalable

- Comando principal: \`devsteps\`
- Uso recomendado: terminal, automatización local, CI y control explícito del pipeline.

### 2. Skill para agentes

- Comando principal: \`devsteps inject\`
- Archivos generados: \`AGENTS.md\`, \`CLAUDE.md\`, \`.cursorrules\`, \`.windsurfrules\`
- Uso recomendado: Cursor, Claude Code, Windsurf, Codex y flujos similares.

### 3. Extensión o MCP

- Comandos útiles: \`devsteps plugins --install vscode\`, \`devsteps plugins --install github-actions\`
- Archivo de ejemplo MCP: \`opencode.json\`
- Uso recomendado: conectar el proyecto con editores y herramientas que exponen contexto vía plugins o MCP.

## Documentación guiada

- [docs/getting-started.md](docs/getting-started.md)
- [docs/requirements.md](docs/requirements.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/publishing.md](docs/publishing.md)

## Estado del pipeline

${context ? `**Estado:** ${context.status.toUpperCase()}\n**Progreso:** ${completedSteps.length}/${steps.length} pasos completados` : '**Estado:** No iniciado'}

## Pasos del pipeline

${steps.map((s, i) => {
  const done = completedSteps.includes(s.id)
  return `${done ? '- [x]' : '- [ ]'} **${i + 1}. ${s.name}** — ${s.description}`
}).join('\n')}

## Scripts y comandos útiles

| Comando | Descripción |
|---------|-------------|
| \`npm run build\` | Compilar TypeScript a \`dist/\` |
| \`npm run typecheck\` | Verificar tipos sin emitir |
| \`npm test\` | Ejecutar la suite de tests |
| \`npm run validate\` | Ejecutar validación DS-v1 |
| \`devsteps guide\` | Guía interactiva paso a paso |
| \`devsteps inject\` | Generar archivos para agentes |
| \`devsteps docs --all\` | Generar documentación base |
| \`devsteps plugins --install vscode\` | Preparar integración con VS Code |

## Estándar de calidad

Este proyecto sigue **${config.project.standard}** y actualmente define ${DS_V1.norms.length} normas entre documentación, seguridad, arquitectura, testing y release.

## Licencia

MIT
`
  writeFileSync(resolve(root, 'README.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ README.md'))
}

function generateRequirementsDoc(root: string, config: DevStepsConfig): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const content = `# Requirements — ${config.project.name}

## Product Goal

Entregar una herramienta lista para producción y publicación que ayude a una persona principiante a ejecutar un proyecto de software con un pipeline claro y reusable.

## Target User

- Persona que empieza prácticamente desde cero en desarrollo.
- Persona que necesita instrucciones operativas paso a paso.
- Persona que quiere aprender a usar agentes como Codex, Claude Code u OpenCode sin perder visibilidad del proceso.

## Functional Requirements

- Debe ofrecer un CLI instalable con comandos para inicializar, ejecutar, validar y documentar proyectos.
- Debe permitir un modo guiado paso a paso para acompañar a usuarios principiantes.
- Debe poder generar archivos de instrucciones para agentes y editores.
- Debe soportar una superficie de integración para extensiones o entornos basados en MCP.
- Debe permitir validar artefactos del proyecto contra el estándar DS-v1.
- Debe generar documentación base de producto, arquitectura, ADR y publicación.
- Debe permitir configurar automatización mínima para GitHub Actions y VS Code.

## Non-Functional Requirements

- Debe ejecutarse con Node.js 20 o superior.
- Debe compilar en TypeScript estricto.
- Debe exponer un flujo entendible desde terminal sin requerir conocimiento previo profundo.
- Debe funcionar sin credenciales embebidas en código.
- Debe poder compartirse en GitHub con documentación suficiente para onboarding y contribución.

## Distribution Modes

- CLI instalable por \`npm\` o \`npm link\`.
- Skill/instrucciones de agente generadas por \`devsteps inject\`.
- Integración por plugin o MCP usando archivos y configuración del proyecto.

## Success Criteria

- \`npm run build\`, \`npm run typecheck\` y \`npm test\` deben pasar.
- Deben existir \`README.md\`, \`docs/requirements.md\`, \`docs/architecture.md\`, \`CHANGELOG.md\` y \`LICENSE\`.
- Un usuario nuevo debe poder ejecutar un primer flujo siguiendo solo la documentación.
`

  writeFileSync(resolve(dir, 'requirements.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ docs/requirements.md'))
}

function generateArchitectureDoc(root: string, config: DevStepsConfig): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const content = `# Architecture — ${config.project.name}

## Overview

${config.project.description || 'CLI en TypeScript para orquestar el ciclo de vida de un proyecto con soporte para agentes, documentación y validación.'}

## Runtime Stack

${config.project.stack.map((s: string) => `- ${s}`).join('\n')}

## Core Components

- \`src/cli.ts\`: punto de entrada del CLI y registro de comandos.
- \`src/engine/*\`: ejecución del pipeline, contexto, gates y checkpoints.
- \`src/launchers/*\`: adaptadores para sistemas como Codex, Claude, OpenCode, humano y auto.
- \`src/standard/*\`: definición DS-v1 y validadores.
- \`src/docs.ts\`, \`src/guide.ts\`, \`src/plugins.ts\`: experiencia de onboarding, documentación e integraciones.

## System Flow

1. El usuario ejecuta el CLI.
2. El CLI carga \`devsteps.yaml\`.
3. El engine resuelve el paso actual del pipeline.
4. Los launchers ejecutan sistemas humanos, automáticos o agentes.
5. Los resultados se guardan como contexto, checkpoints y artefactos.
6. La validación DS-v1 comprueba documentación, seguridad y release.

## Main Operating Modes

- CLI: operación directa desde terminal.
- Skill: generación de archivos de instrucciones para agentes y editores.
- Extension/MCP: integración con VS Code, GitHub Actions y configuraciones compatibles con MCP.

## Pipeline

El pipeline de desarrollo está definido en \`devsteps.yaml\` con ${config.pipeline.length} pasos:

${config.pipeline.map((s) => `- **${s.name}**: ${s.description}`).join('\n')}

## Quality Boundary

- TypeScript estricto como base de confiabilidad.
- Validación DS-v1 para documentación, setup y seguridad.
- Tests en Vitest como red mínima para evolución del CLI.
- Publicación soportada por build reproducible y documentación generada.

## ADR Policy

Las decisiones de arquitectura se documentan como ADRs en \`docs/adr-*.md\`.
`
  writeFileSync(resolve(dir, 'architecture.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ docs/architecture.md'))
}

function generateGettingStartedDoc(root: string, config: DevStepsConfig): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const content = `# Getting Started

## 1. Instala prerrequisitos

- Node.js 20 o superior
- Git
- Una terminal
- Opcional: Codex, Claude Code, OpenCode, Cursor o Windsurf

## 2. Instala devSteps

\`\`\`bash
npm install -g sp-devsteps
\`\`\`

Si estás contribuyendo a este repositorio, usa instalación local:

\`\`\`bash
npm install
npm run build
npm test
npm link
\`\`\`

## 3. Crea tu primer proyecto

\`\`\`bash
mkdir mi-primer-proyecto
cd mi-primer-proyecto
devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force
\`\`\`

Este comando crea una base con \`package.json\`, \`tsconfig.json\`, \`src/\`, \`tests/\`, documentación inicial, licencia, changelog y \`devsteps.yaml\`.

## 4. Recorre la experiencia guiada dentro del proyecto

\`\`\`bash
devsteps guide
\`\`\`

Este modo explica cada paso del pipeline y es la entrada recomendada para principiantes.

## 5. Activa el modo skill para agentes y editores

\`\`\`bash
devsteps inject
\`\`\`

Esto genera archivos como \`AGENTS.md\` y \`CLAUDE.md\` para que el editor o agente tenga contexto estable.

## 6. Alinea con DevControl si está disponible

\`\`\`bash
sp-devcontrol inject
sp-devcontrol project:check
\`\`\`

DevControl funciona como proyecto hermano: agrega gobernanza, comprobaciones y reportes complementarios al pipeline de devSteps.

## 7. Configura tu editor

### VS Code

\`\`\`bash
devsteps plugins --install vscode
\`\`\`

### OpenCode / MCP

Revisa y adapta \`opencode.json\` para conectar servicios MCP del proyecto.

## 8. Valida antes de continuar

\`\`\`bash
devsteps validate
npm install
npm run build
npm test
\`\`\`

## 9. Flujo recomendado de trabajo

1. Define o revisa la idea.
2. Completa requisitos y arquitectura.
3. Usa \`devsteps guide\` o \`devsteps run\`.
4. Valida con tests y DS-v1.
5. Publica cambios con commits convencionales.
`

  writeFileSync(resolve(dir, 'getting-started.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ docs/getting-started.md'))
}

function generatePublishingDoc(root: string, config: DevStepsConfig): void {
  const dir = resolve(root, 'docs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const content = `# Publishing

## Objective

Publicar ${config.project.name} de forma compartible en GitHub y dejarlo listo para distribución como CLI.

## Checklist previa

- Ejecutar \`npm run build\`
- Ejecutar \`npm run typecheck\`
- Ejecutar \`npm test\`
- Confirmar que existen README, LICENSE y CHANGELOG
- Confirmar que \`devsteps validate\` no reporta faltantes críticos de documentación

## Publicación en GitHub

1. Crea el repositorio remoto.
2. Añade el remoto:

\`\`\`bash
git remote add origin <url-del-repo>
\`\`\`

3. Crea una rama principal si hace falta:

\`\`\`bash
git branch -M main
\`\`\`

4. Sube el proyecto:

\`\`\`bash
git push -u origin main
\`\`\`

## CI recomendado

Puedes generar una base con:

\`\`\`bash
devsteps plugins --install github-actions
\`\`\`

## Publicación como CLI

### Prueba local

\`\`\`bash
npm run build
npm link
devsteps --help
\`\`\`

### Publicación en npm

\`\`\`bash
npm pack --dry-run
npm publish
\`\`\`

## Release discipline

- Usa Conventional Commits.
- Actualiza \`CHANGELOG.md\`.
- Mantén SemVer en \`package.json\`.
- Documenta decisiones importantes como ADR.
`

  writeFileSync(resolve(dir, 'publishing.md'), content, 'utf-8')
  console.log(chalk.green('  ✓ docs/publishing.md'))
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
  const adrCount = existsSync(dir)
    ? readdirSync(dir).filter((file) => /^adr-\d{3}-.*\.md$/i.test(file)).length
    : 0
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
