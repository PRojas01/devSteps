import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { load, dump } from 'js-yaml'
import type { NormDefinition, NormCategory, Severity } from '../types.js'
import { DS_V1 } from './ds-v1.js'

interface CustomStandardConfig {
  id: string
  name: string
  extends?: string
  norms: CustomNormDef[]
}

interface CustomNormDef {
  id: string
  name: string
  description: string
  category: NormCategory
  severity: Severity
  scope: string[]
  validation: {
    type: 'regex' | 'exists' | 'content' | 'structure' | 'command' | 'custom'
    pattern?: string
    patterns?: string[]
    checker?: string
  }
  aiPrompt: string
  enabled: boolean
}

function getStandardPath(root: string, name?: string): string {
  return resolve(root, '.devsteps', name ? `standard-${name}.yaml` : 'standard.yaml')
}

export function loadCustomStandard(root: string, name?: string): CustomStandardConfig | null {
  const path = getStandardPath(root, name)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf-8')
  return load(raw) as CustomStandardConfig
}

export function saveCustomStandard(config: CustomStandardConfig, root: string, name?: string): void {
  const yaml = dump(config, { indent: 2 })
  writeFileSync(getStandardPath(root, name), yaml, 'utf-8')
}

export function compileStandard(root: string, name?: string): NormDefinition[] {
  const custom = loadCustomStandard(root, name)
  if (!custom) return DS_V1.norms

  let base: NormDefinition[]
  if (custom.extends === 'ds-v1' || !custom.extends) {
    base = [...DS_V1.norms]
  } else {
    const parent = loadCustomStandard(root, custom.extends)
    base = parent ? compileStandard(root, custom.extends) : DS_V1.norms
  }

  const customIds = new Set(custom.norms.map(n => n.id))

  const merged: NormDefinition[] = [
    ...base.filter(n => !customIds.has(n.id) && custom.norms.find(cn => cn.id === n.id)?.enabled !== false),
    ...custom.norms
      .filter(n => n.enabled)
      .map(n => ({
        ...n,
        validation: n.validation,
        aiPrompt: n.aiPrompt,
      })),
  ]

  return merged
}

export function runCustomStandard(root: string, options: { create?: boolean; edit?: boolean; compile?: boolean; name?: string }): void {
  if (options.create) {
    const template: CustomStandardConfig = {
      id: 'my-standard',
      name: 'My Custom Standard',
      extends: 'ds-v1',
      norms: [
        {
          id: 'CUSTOM-001',
          name: 'Custom norm example',
          description: 'Description of your custom norm',
          category: 'quality',
          severity: 'error',
          scope: ['src/**/*.ts'],
          validation: { type: 'regex', patterns: ['your-pattern'] },
          aiPrompt: 'Your AI prompt for this norm',
          enabled: true,
        },
      ],
    }
    saveCustomStandard(template, root, options.name)
    console.log(chalk.green(`  ✓ Standard creado: ${getStandardPath(root, options.name)}`))
    console.log(chalk.dim('  Edítalo y luego ejecuta "devsteps standard:custom --compile"'))
    console.log('')
    console.log(chalk.bold('Estructura:'))
    console.log(chalk.dim(JSON.stringify(template, null, 2)))
    return
  }

  if (options.edit) {
    const path = getStandardPath(root, options.name)
    if (!existsSync(path)) {
      console.log(chalk.yellow(`No existe standard. Crea uno con --create primero.`))
      return
    }
    const config = loadCustomStandard(root, options.name)
    if (!config) {
      console.log(chalk.red(`Error cargando ${path}`))
      return
    }
    console.log(chalk.cyan(`\n  Standard actual: ${config.name} (${config.id})`))
    console.log(chalk.cyan(`  Normas: ${config.norms.length} (${config.norms.filter(n => n.enabled).length} activas)`))
    console.log('')
    for (const norm of config.norms) {
      const status = norm.enabled ? chalk.green('✓') : chalk.dim('✗')
      const sev = norm.severity === 'error' ? chalk.red('error') : chalk.yellow('warning')
      console.log(`  ${status} ${chalk.bold(norm.id)} — ${norm.name} (${sev})`)
      console.log(chalk.dim(`     ${norm.description}`))
    }
    console.log('')
    console.log(chalk.dim(`  Edita el archivo en: ${path}`))
    return
  }

  if (options.compile) {
    const compiled = compileStandard(root, options.name)
    console.log(chalk.green(`\n  Standard compilado: ${compiled.length} normas activas\n`))
    const custom = loadCustomStandard(root, options.name)
    if (custom) {
      console.log(chalk.bold(`  Base: ${custom.extends ?? 'ds-v1'}`))
      console.log(chalk.bold(`  Normas base heredadas: ${compiled.filter(n => !n.id.startsWith('CUSTOM-')).length}`))
      console.log(chalk.bold(`  Normas personalizadas: ${compiled.filter(n => n.id.startsWith('CUSTOM-')).length}`))
      console.log('')
      for (const norm of compiled) {
        const source = norm.id.startsWith('CUSTOM-') ? chalk.cyan('[custom]') : chalk.dim('[ds-v1]')
        const sev = norm.severity === 'error' ? chalk.red('●') : chalk.yellow('◌')
        console.log(`  ${sev} ${source} ${chalk.bold(norm.id)}: ${norm.name}`)
      }
    }
    console.log('')
    return
  }

  console.log(chalk.bold('\n📏 devSteps Custom Standard'))
  console.log('')
  console.log(chalk.cyan('Uso:'))
  console.log('  devsteps standard:custom --create          Crear un nuevo standard personalizado')
  console.log('  devsteps standard:custom --edit            Ver estado del standard actual')
  console.log('  devsteps standard:custom --compile         Compilar y ver normas resultantes')
  console.log('  devsteps standard:custom --name <name>     Usar un nombre de archivo específico')
  console.log('')
  console.log(chalk.dim('Los standards personalizados se guardan en .devsteps/standard.yaml'))
  console.log(chalk.dim('Pueden extender ds-v1 u otros standards personalizados.'))
}
