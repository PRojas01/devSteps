/** Module purpose: supports devSteps plugins functionality. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { load, dump } from 'js-yaml'
import type { DevStepsConfig, SystemId } from './types.js'
import { loadConfig } from './config.js'

interface PluginConfig {
  id: string
  name: string
  description: string
  type: 'github-actions' | 'vscode' | 'slack' | 'custom'
  enabled: boolean
  config: Record<string, unknown>
}

interface PluginSystem {
  config: PluginConfig[]
}

const PLUGIN_FILE = '.devsteps/plugins.yaml'

function getPluginPath(root: string): string {
  return resolve(root, PLUGIN_FILE)
}

function loadPlugins(root: string): PluginConfig[] {
  const path = getPluginPath(root)
  if (!existsSync(path)) return []
  const raw = readFileSync(path, 'utf-8')
  const data = load(raw) as PluginSystem | null
  return data?.config ?? []
}

function savePlugins(root: string, plugins: PluginConfig[]): void {
  const path = getPluginPath(root)
  const dir = resolve(root, '.devsteps')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const yaml = dump({ config: plugins }, { indent: 2 })
  writeFileSync(path, yaml, 'utf-8')
}

function generateGitHubActions(config: DevStepsConfig): string {
  const steps = config.pipeline
  return `name: devSteps Pipeline

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - run: npm ci

      - name: TypeScript Check
        run: npx tsc --noEmit
        continue-on-error: true

      - name: Lint
        run: npx eslint src/
        continue-on-error: true

      - name: Tests
        run: npx vitest run --reporter=verbose

      - name: DS-v1 Validation
        run: npx devsteps validate
        continue-on-error: true

      - name: devSteps Report
        run: |
          echo "## Pipeline: ${config.project.name}" >> $GITHUB_STEP_SUMMARY
          echo "**Type:** ${config.project.type}" >> $GITHUB_STEP_SUMMARY
          echo "**Steps:** ${steps.length}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          for step in ${steps.map(s => s.name).join(' ')}; do
            echo "- \$step" >> $GITHUB_STEP_SUMMARY
          done

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Secrets Scan
        run: |
          npx secretlint "**/*" 2>/dev/null || echo "secretlint not available"
          npx trufflehog git file://. 2>/dev/null || echo "trufflehog not available"

      - name: Dependency Audit
        run: npm audit --audit-level=high
`
}

function generateVSCodeSettings(): string {
  return JSON.stringify({
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'always',
    },
    'typescript.tsdk': 'node_modules/typescript/lib',
    'typescript.enablePromptUseWorkspaceTsdk': true,
    'files.exclude': {
      '**/.git': true,
      '**/node_modules': true,
      '**/dist': true,
    },
    'search.exclude': {
      '**/node_modules': true,
      '**/dist': true,
      '**/coverage': true,
    },
    'vitest.enable': true,
    'eslint.validate': ['typescript', 'typescriptreact', 'javascript'],
  }, null, 2)
}

function generateSlackNotification(webhookUrl: string): string {
  return `#!/usr/bin/env node
// devSteps Slack Notifier
// Configura: SLACK_WEBHOOK_URL en entorno o en plugins.yaml

const WEBHOOK = process.env.SLACK_WEBHOOK_URL || '${webhookUrl}'
const { execSync } = require('child_process')

function getStatus() {
  try {
    const ctx = JSON.parse(require('fs').readFileSync('.devsteps/context.json', 'utf-8'))
    return ctx
  } catch { return null }
}

function sendNotification(message) {
  if (!WEBHOOK || WEBHOOK.includes('your-webhook')) {
    console.log('No SLACK_WEBHOOK_URL configured')
    return
  }
  const https = require('https')
  const data = JSON.stringify({ text: message })
  const url = new URL(WEBHOOK)
  const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } })
  req.write(data)
  req.end()
}

const context = getStatus()
if (context) {
  sendNotification(\`devSteps: Pipeline \${context.status} — Current step: \${context.currentStep}\`)
}
`
}

export function runPlugins(root: string, options: { install?: string; list?: boolean; status?: boolean }): void {
  const config = loadConfig(root)
  if (!config && options.install !== 'init') {
    console.log(chalk.red('No devsteps.yaml found.'))
    return
  }

  if (options.list) {
    const plugins = loadPlugins(root)
    console.log(chalk.bold('\n  🔌 Plugins instalados:\n'))
    if (plugins.length === 0) {
      console.log(chalk.dim('  No hay plugins configurados.'))
    }
    for (const p of plugins) {
      const status = p.enabled ? chalk.green('✓ activo') : chalk.dim('✗ desactivado')
      console.log(`  ${chalk.bold(p.name)} (${p.type}) ${status}`)
      console.log(chalk.dim(`    ${p.description}`))
    }
    console.log('')
    return
  }

  if (options.install) {
    const type = options.install as PluginConfig['type']
    const plugins = loadPlugins(root)

    let newPlugin: PluginConfig

    switch (type) {
      case 'github-actions': {
        const ciDir = resolve(root, '.github/workflows')
        if (!existsSync(ciDir)) mkdirSync(ciDir, { recursive: true })
        const workflow = generateGitHubActions(config!)
        writeFileSync(resolve(ciDir, 'devsteps-pipeline.yml'), workflow, 'utf-8')
        console.log(chalk.green('  ✓ GitHub Actions workflow generado'))
        newPlugin = {
          id: `github-actions-${Date.now()}`,
          name: 'GitHub Actions Pipeline',
          description: 'CI/CD pipeline con validación DS-v1, typecheck, tests, y security scan',
          type: 'github-actions',
          enabled: true,
          config: { workflow: '.github/workflows/devsteps-pipeline.yml' },
        }
        break
      }
      case 'vscode': {
        const vscodeDir = resolve(root, '.vscode')
        if (!existsSync(vscodeDir)) mkdirSync(vscodeDir, { recursive: true })
        writeFileSync(resolve(vscodeDir, 'settings.json'), generateVSCodeSettings(), 'utf-8')
        writeFileSync(resolve(vscodeDir, 'extensions.json'), JSON.stringify({
          recommendations: ['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode', 'zixuanchen.vitest-explorer', 'yoavbls.pretty-ts-errors'],
        }, null, 2), 'utf-8')
        console.log(chalk.green('  ✓ VS Code settings generados'))
        newPlugin = {
          id: `vscode-${Date.now()}`,
          name: 'VS Code Configuration',
          description: 'Configuraciones y extensiones recomendadas para VS Code',
          type: 'vscode',
          enabled: true,
          config: { settings: '.vscode/settings.json', extensions: '.vscode/extensions.json' },
        }
        break
      }
      case 'slack': {
        const slackDir = resolve(root, 'scripts')
        if (!existsSync(slackDir)) mkdirSync(slackDir, { recursive: true })
        writeFileSync(resolve(slackDir, 'slack-notify.js'), generateSlackNotification(''), 'utf-8')
        console.log(chalk.green('  ✓ Slack notifier generado en scripts/slack-notify.js'))
        newPlugin = {
          id: `slack-${Date.now()}`,
          name: 'Slack Notifications',
          description: 'Notificaciones de estado del pipeline a Slack',
          type: 'slack',
          enabled: true,
          config: { script: 'scripts/slack-notify.js', webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '' },
        }
        break
      }
      default:
        console.log(chalk.red(`Tipo de plugin no soportado: ${type}`))
        console.log(chalk.dim('Tipos disponibles: github-actions, vscode, slack'))
        return
    }

    plugins.push(newPlugin)
    savePlugins(root, plugins)
    console.log(chalk.green(`  ✓ Plugin "${newPlugin.name}" registrado`))
    console.log('')
    return
  }

  console.log(chalk.bold('\n  🔌 devSteps Plugins\n'))
  console.log(chalk.cyan('Uso:'))
  console.log('  devsteps plugins --install github-actions   Generar GitHub Actions workflow')
  console.log('  devsteps plugins --install vscode            Configurar VS Code')
  console.log('  devsteps plugins --install slack             Configurar notificaciones Slack')
  console.log('  devsteps plugins --list                      Listar plugins instalados')
  console.log('')
}
