/** Module purpose: supports devSteps watch functionality. */
import { watch } from 'fs'
import { resolve, relative } from 'path'
import chalk from 'chalk'
import type { FSWatcher } from 'fs'
import type { DevStepsConfig, NormCheck } from './types.js'
import { loadConfig } from './config.js'
import { DS_V1, getNormsByScope } from './standard/ds-v1.js'
import { validateFileAgainstNorm, validateProjectAgainstStandard } from './standard/validator.js'

interface WatchOptions {
  category?: string
  pollInterval?: number
}

export function runWatch(root: string, options: WatchOptions): void {
  const config = loadConfig(root)
  if (!config) {
    console.log(chalk.red('No devsteps.yaml found. Run "devsteps init" first.'))
    process.exit(1)
  }

  const norms = options.category
    ? DS_V1.norms.filter(n => n.category === options.category)
    : DS_V1.norms

  console.log(chalk.bold('\n  devsteps watch — Validación en tiempo real'))
  console.log(chalk.dim(`  Estándar: ${DS_V1.name} (${norms.length} normas activas)`))
  console.log(chalk.dim(`  Directorio: ${root}`))
  if (options.category) console.log(chalk.dim(`  Categoría: ${options.category}`))
  console.log('')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const DEBOUNCE_MS = options.pollInterval ?? 500
  let lastResults: NormCheck[] = []
  let errorsFound = false
  let warningsFound = false

  function validateAll(): void {
    const results = validateProjectAgainstStandard(root, norms)
    lastResults = results

    const passed = results.filter(r => r.result === 'pass')
    const failed = results.filter(r => r.result === 'fail')
    errorsFound = failed.some(r => r.severity === 'error')
    warningsFound = failed.some(r => r.severity === 'warning')

    process.stdout.write('\x1b[2J\x1b[H')
    console.log(chalk.bold(`\n  devsteps watch — ${new Date().toLocaleTimeString()}`))
    console.log(chalk.dim(`  ${DS_V1.name} · ${passed.length} ✓ | ${failed.length} ✗\n`))

    for (const check of results) {
      if (check.result === 'pass') continue
      const icon = check.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠')
      const file = check.filepath ? chalk.dim(` [${relative(root, check.filepath)}]`) : ''
      console.log(`  ${icon} ${chalk.bold(check.normId)}: ${check.message}${file}`)
    }

    if (failed.length === 0) {
      console.log(chalk.green('  ✅ Todas las normas cumplidas'))
    }
    console.log('')
    console.log(chalk.dim('  Observando cambios de archivos... (Ctrl+C para salir)'))
  }

  validateAll()
  console.log('')

  const watchedDirs = new Set<string>()
  const watchers: FSWatcher[] = []

  function watchRecursive(dir: string): void {
    if (watchedDirs.has(dir)) return
    watchedDirs.add(dir)

    try {
      const w = watch(dir, { recursive: false }, (eventType, filename) => {
        if (!filename) return
        const fullPath = resolve(dir, filename)
        const ext = filename.split('.').pop()?.toLowerCase()
        if (!ext || ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'yaml', 'yml', 'css', 'html'].includes(ext)) {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(validateAll, DEBOUNCE_MS)
        }
      })
      watchers.push(w)
    } catch {
      // skip unwatchable directories
    }

    try {
      const { readdirSync, statSync } = require('fs')
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue
        const fullPath = resolve(dir, entry.name)
        if (entry.isDirectory()) watchRecursive(fullPath)
      }
    } catch {
      // skip
    }
  }

  watchRecursive(root)

  if (watchers.length === 0) {
    console.log(chalk.yellow('  No se pudieron establecer watchers de archivos.'))
    console.log(chalk.yellow('  Usa --poll para activar el modo de polling.'))
  }

  process.on('SIGINT', () => {
    console.log(chalk.dim('\n  Cerrando watchers...'))
    for (const w of watchers) w.close()
    if (errorsFound) {
      console.log(chalk.red(`\n  ⚠ Quedan ${lastResults.filter(r => r.result === 'fail' && r.severity === 'error').length} errores por resolver.`))
    }
    if (warningsFound) {
      console.log(chalk.yellow(`  ⚠ Quedan ${lastResults.filter(r => r.result === 'fail' && r.severity === 'warning').length} advertencias.`))
    }
    if (!errorsFound && !warningsFound) {
      console.log(chalk.green('\n  ✅ Todas las normas cumplidas. ¡Buen trabajo!'))
    }
    process.exit(0)
  })
}
