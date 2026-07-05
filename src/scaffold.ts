/** Module purpose: supports devSteps scaffold functionality. */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import type { ProjectType } from './types.js'
import { getAvailablePipelineTypes } from './catalog/pipelines.js'
import { loadConfig, saveConfig, createDefaultConfig, configExists } from './config.js'
import { generateDocs } from './docs.js'

interface ScaffoldOptions {
  type?: ProjectType
  name?: string
  description?: string
  stack?: string
  force?: boolean
}

const TS_TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    outDir: './dist',
    rootDir: './src',
    declaration: true,
    declarationMap: true,
    sourceMap: true,
    resolveJsonModule: true,
  },
  include: ['src'],
  exclude: ['node_modules', 'dist'],
}

const GITIGNORE = `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.tmp/
`

const ESLINT_CONFIG = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
}

function scaffoldPackageJson(name: string, type: ProjectType, description: string, stack: string[]): Record<string, unknown> {
  const deps: Record<string, string> = {}
  const devDeps: Record<string, string> = {
    typescript: '^5.7.0',
    tsx: '^4.19.0',
    vitest: '^3.0.0',
    '@types/node': '^22.0.0',
    eslint: '^8.57.0',
    prettier: '^3.4.0',
    '@typescript-eslint/parser': '^8.0.0',
    '@typescript-eslint/eslint-plugin': '^8.0.0',
  }

  if (stack.includes('react') || type === 'web-app') {
    deps.react = '^19.0.0'
    deps['react-dom'] = '^19.0.0'
    devDeps['@types/react'] = '^19.0.0'
    devDeps['@types/react-dom'] = '^19.0.0'
    devDeps['@vitejs/plugin-react'] = '^4.0.0'
  }
  if (stack.includes('express') || type === 'api-service') {
    deps.express = '^4.21.0'
    devDeps['@types/express'] = '^5.0.0'
  }
  if (stack.includes('vue')) {
    deps.vue = '^3.5.0'
    devDeps['@vitejs/plugin-vue'] = '^5.0.0'
  }
  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    description,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      start: 'node dist/index.js',
      dev: 'tsx watch src/index.ts',
      test: 'vitest run',
      'test:watch': 'vitest',
      lint: 'eslint src/',
      typecheck: 'tsc --noEmit',
      validate: 'devsteps validate',
      format: 'prettier --write src/',
    },
    keywords: [type, ...stack],
    engines: { node: '>=20.0.0' },
    dependencies: deps,
    devDependencies: devDeps,
  }
}

function scaffoldEntryFile(type: ProjectType, stack: string[]): string {
  const lines: string[] = []

  if (stack.includes('express') || type === 'api-service') {
    lines.push(`/** Starts the HTTP API and exposes the service health endpoint. */`)
    lines.push(`import express from 'express'`)
    lines.push('')
    lines.push(`const app = express()`)
    lines.push(`const PORT = process.env.PORT ?? 3000`)
    lines.push('')
    lines.push(`app.use(express.json())`)
    lines.push('')
    lines.push(`app.get('/health', (_req, res) => {`)
    lines.push(`  res.json({ status: 'ok', timestamp: new Date().toISOString() })`)
    lines.push(`})`)
    lines.push('')
    lines.push(`app.listen(PORT, () => {`)
    lines.push(`  process.stdout.write(\`Server running on port \${PORT}\\n\`)`)
    lines.push(`})`)
  } else if (type === 'cli-tool') {
    lines.push(`#!/usr/bin/env node`)
    lines.push(`/** Provides the command-line entry point for the generated project. */`)
    lines.push('')
    lines.push(`function main(): void {`)
    lines.push(`  const args = process.argv.slice(2)`)
    lines.push(`  process.stdout.write(\`Hello from \${args[0] ?? 'devSteps CLI'}\\n\`)`)
    lines.push(`}`)
    lines.push('')
    lines.push(`main()`)
  } else if (type === 'data-pipeline') {
    lines.push(`/** Runs the generated data processing pipeline and writes its output artifact. */`)
    lines.push(`import { mkdirSync, writeFileSync } from 'fs'`)
    lines.push(`import { resolve } from 'path'`)
    lines.push('')
    lines.push(`async function runPipeline(): Promise<void> {`)
    lines.push(`  process.stdout.write('Data pipeline starting...\\n')`)
    lines.push(`  const data = { message: 'Hello from devSteps data pipeline' }`)
    lines.push(`  const outputPath = resolve('output', 'result.json')`)
    lines.push(`  mkdirSync(resolve('output'), { recursive: true })`)
    lines.push(`  writeFileSync(outputPath, JSON.stringify(data, null, 2))`)
    lines.push(`  process.stdout.write(\`Output written to \${outputPath}\\n\`)`)
    lines.push(`}`)
    lines.push('')
    lines.push(`runPipeline().catch(console.error)`)
  } else {
    lines.push(`/** Exposes the generated application entry point. */`)
    lines.push(`export function start(): string {`)
    lines.push(`  return 'Hello from devSteps!'`)
    lines.push(`}`)
  }

  return lines.join('\n') + '\n'
}

function scaffoldTestFile(type: ProjectType): string {
  const lines: string[] = []
  lines.push(`import { describe, it, expect } from 'vitest'`)
  lines.push('')
  lines.push(`describe('${type} project', () => {`)
  lines.push(`  it('should pass a basic test', () => {`)
  lines.push(`    expect(1 + 1).toBe(2)`)
  lines.push(`  })`)
  lines.push(`})`)
  lines.push('')
  return lines.join('\n')
}

function scaffoldReadme(name: string, type: ProjectType, description: string, stack: string[]): string {
  return `# ${name}

${description || `A ${type} project built with devSteps.`}

## Stack

${stack.map(s => `- ${s}`).join('\n')}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

\`\`\`
├── src/           # Source code
├── tests/         # Test files  
├── docs/          # Documentation
├── templates/     # Templates
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Scripts

| Command | Description |
|---|---|
| \`npm run build\` | Compile TypeScript |
| \`npm run dev\` | Run in development mode |
| \`npm test\` | Run tests |
| \`npm run lint\` | Lint source code |
| \`npm run typecheck\` | Type-check without emitting |

## Standard

This project follows the devSteps Standard v1 (DS-v1) for quality, security, and documentation.

## License

MIT
`
}

function scaffoldChangelog(): string {
  return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - ${new Date().toISOString().split('T')[0]}

### Added

- Initial project scaffolded with devSteps
`
}

function scaffoldDocs(type: ProjectType): string {
  const template: Record<ProjectType, string> = {
    'web-app': `# Architecture

## Overview
Web application built with modern frontend stack.

## Components
- Frontend UI
- API layer
- State management
- Routing

## Data Flow
Client → API → Service → Data Layer

## Decisions
- TypeScript for type safety
- Component-based architecture
- Responsive design
`,
    'cli-tool': `# Architecture

## Overview
Command-line interface tool.

## Components
- CLI entry point (bin/)
- Commands
- Services
- Utilities

## Data Flow
User Input → CLI Parser → Command Handler → Output

## Decisions
- ESM modules
- Minimal dependencies
- Cross-platform support
`,
    'library': `# Architecture

## Overview
Reusable library with clear public API.

## Components
- Public API (index.ts exports)
- Internal modules
- Type definitions

## Data Flow
Consumer → Public API → Internal Implementation

## Decisions
- Tree-shakeable exports
- Comprehensive TypeScript types
- Zero runtime dependencies
`,
    'api-service': `# Architecture

## Overview
REST API service.

## Components
- Routes / Controllers
- Services / Business Logic
- Data Access Layer
- Middleware

## Data Flow
HTTP Request → Router → Middleware → Controller → Service → Response

## Decisions
- Express.js for routing
- Layered architecture
- Input validation at controller level
`,
    'data-pipeline': `# Architecture

## Overview
Data processing pipeline.

## Components
- Data ingestion
- Transformation
- Storage/Export
- Monitoring

## Data Flow
Source → Ingest → Transform → Store → Export

## Decisions
- Stream-based processing
- Idempotent transformations
- Error handling with retry logic
`,
  }
  return template[type]
}

export async function runScaffold(root: string, options: ScaffoldOptions): Promise<void> {
  let name = options.name
  let type = options.type
  let description = options.description ?? ''
  let stack = options.stack?.split(',').map(s => s.trim()) ?? ['typescript']

  if (!name || !type) {
    const answers = await inquirer.prompt([
      ...(name ? [] : [{ type: 'input', name: 'name', message: 'Project name:', default: root.split('/').pop() ?? 'my-project' }]),
      ...(type ? [] : [{ type: 'list', name: 'type', message: 'Project type:', choices: getAvailablePipelineTypes(), default: 'web-app' }]),
      ...(description ? [] : [{ type: 'input', name: 'description', message: 'Description:', default: '' }]),
    ])
    name = name ?? answers.name
    type = type ?? answers.type
    description = description ?? answers.description
  }

  if (!type || !getAvailablePipelineTypes().includes(type)) {
    console.log(chalk.red(`Invalid project type. Available: ${getAvailablePipelineTypes().join(', ')}`))
    return
  }

  const projectName = name!
  const projectType = type as ProjectType

  const dirs = ['src', 'tests', 'docs', 'templates', 'scripts']
  const structure: Record<string, string> = {}

  structure['package.json'] = JSON.stringify(scaffoldPackageJson(projectName, projectType, description, stack), null, 2) + '\n'
  structure['tsconfig.json'] = JSON.stringify(TS_TSCONFIG, null, 2) + '\n'
  structure['.gitignore'] = GITIGNORE
  structure['README.md'] = scaffoldReadme(projectName, projectType, description, stack)
  structure['CHANGELOG.md'] = scaffoldChangelog()
  structure['.eslintrc.json'] = JSON.stringify(ESLINT_CONFIG, null, 2) + '\n'
  structure['LICENSE'] = `MIT License

Copyright (c) ${new Date().getFullYear()} ${projectName}

Permission is hereby granted...
`
  structure['src/index.ts'] = scaffoldEntryFile(projectType, stack)
  structure['tests/index.test.ts'] = scaffoldTestFile(projectType)
  structure['docs/architecture.md'] = scaffoldDocs(projectType)
  structure['docs/requirements.md'] = `# Requirements\n\n## Functional\n\n## Non-Functional\n`
  structure['docs/adr-001-initial-architecture.md'] = `# ADR-001: Initial Architecture\n\n**Status:** Proposed\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n## Context\n\n## Decision\n\n## Consequences\n`

  if (existsSync(root) && !options.force) {
    const existing = Object.keys(structure).filter(f => existsSync(resolve(root, f)))
    if (existing.length > 0) {
      console.log(chalk.yellow(`\n⚠ Ya existen ${existing.length} archivos en el directorio:`))
      for (const f of existing.slice(0, 5)) console.log(chalk.dim(`  • ${f}`))
      if (existing.length > 5) console.log(chalk.dim(`  ... y ${existing.length - 5} más`))

      const { overwrite } = await inquirer.prompt([{
        type: 'confirm', name: 'overwrite', message: '¿Sobrescribir archivos existentes?', default: false,
      }])
      if (!overwrite) {
        console.log(chalk.yellow('Scaffolding cancelado.'))
        return
      }
    }
  }

  for (const dir of dirs) {
    const dirPath = resolve(root, dir)
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
      console.log(chalk.dim(`  📁 ${dir}/`))
    }
  }

  let count = 0
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = resolve(root, filePath)
    const parentDir = filePath.includes('/') ? resolve(root, filePath.split('/').slice(0, -1).join('/')) : root
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
    count++
    console.log(chalk.green(`  ✓ ${filePath}`))
  }

  if (!configExists(root)) {
    const config = createDefaultConfig(projectName, projectType, description, stack)
    saveConfig(config, root)
    console.log(chalk.green('  ✓ devsteps.yaml'))
    count++
  }

  console.log('')
  console.log(chalk.bold(`✅ Proyecto "${projectName}" scaffolded (${count} archivos)`))
  console.log('')
  console.log(chalk.dim('Generando documentación inicial...'))
  generateDocs(root, { all: true })

  console.log(chalk.cyan(`\nSiguientes pasos:`))
  console.log(`  cd ${root}`)
  console.log(`  npm install`)
  console.log(`  devsteps terminal --command guide        (abrir guía en terminal nueva)`)
  console.log(`  devsteps guide                            (guía interactiva aquí)`)
}
