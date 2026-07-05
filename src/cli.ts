#!/usr/bin/env node
/** Defines the main devSteps CLI and wires commands to pipeline, docs, and tooling actions. */
import { Command } from 'commander'
import { existsSync } from 'fs'
import { resolve } from 'path'
import inquirer from 'inquirer'
import { loadConfig, saveConfig, createDefaultConfig, configExists } from './config.js'
import { PipelineRunner } from './engine/pipeline.js'
import { executeSystem, getAvailableSystems, detectTool, detectAllTools, getEnvironmentInfo } from './launchers/index.js'
import { getPipelineForType, getAvailablePipelineTypes } from './catalog/pipelines.js'
import { DS_V1, getNormById, getNormsByCategory, validateFileAgainstNorm, validateProjectAgainstStandard } from './standard/index.js'
import { evaluateViability, getViabilityConfig } from './methods/viability.js'
import { saveCheckpointToDisk, loadCheckpointFromDisk, listCheckpoints, saveContextToDisk, loadContextFromDisk } from './engine/checkpoint.js'
import { formatStepResult, formatPipelineReport, formatContext, formatNormChecks, formatViabilityResult } from './utils/format.js'
import { runInject } from './skill-injector.js'
import type { DevStepsConfig, PipelineContext, SystemResult } from './types.js'
import { getConfigFilePath } from './utils/paths.js'
import { runGuide } from './guide.js'
import { runWatch } from './watch.js'
import { runScaffold } from './scaffold.js'
import { runExplain } from './explain.js'
import { runGitHooks } from './git-hooks.js'
import { runDashboard } from './dashboard.js'
import { runProfile, listProfiles } from './profiles.js'
import { runCustomStandard } from './standard/custom.js'
import { runAutopilot } from './autopilot.js'
import { showHistory } from './history.js'
import { runPlugins } from './plugins.js'
import { generateDocs } from './docs.js'
import { openTerminal } from './terminal.js'
import { cmdNew, cmdList, cmdView, cmdEvaluate, cmdPrioritize, cmdApprove, cmdReject, cmdStats } from './sp-ideas/commands.js'

const program = new Command()

program
  .name('devsteps')
  .description('Stage-based project lifecycle orchestrator with multi-agent support')
  .version('1.0.0')
  .option('--verbose', 'Show detailed output')

program.command('init')
  .description('Initialize devSteps for a new project')
  .option('--name <name>', 'Project name')
  .option('--type <type>', 'Project type (web-app, cli-tool, library, api-service, data-pipeline)')
  .option('--stack <items...>', 'Technology stack (e.g., typescript react node)')
  .option('--auto', 'Non-interactive mode with defaults')
  .action(async (options) => {
    const root = process.cwd()

    if (configExists(root) && !options.force) {
      console.log('devSteps already initialized in this directory.')
      console.log('Use --force to reinitialize.')
      return
    }

    let name = options.name
    let type = options.type
    let description = ''
    let stack = options.stack ?? ['typescript']

    if (!options.auto) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Project name:', default: name ?? root.split('/').pop() ?? 'my-project' },
        { type: 'list', name: 'type', message: 'Project type:', choices: getAvailablePipelineTypes(), default: 'web-app' },
        { type: 'input', name: 'description', message: 'Description:', default: '' },
        { type: 'input', name: 'stack', message: 'Tech stack (comma-separated):', default: 'typescript,node' },
      ])
      name = answers.name
      type = answers.type
      description = answers.description
      stack = answers.stack.split(',').map((s: string) => s.trim())
    }

    const config = createDefaultConfig(name, type, description, stack)
    saveConfig(config, root)

    console.log(`\n  devSteps initialized for: ${name}`)
    console.log(`  Type: ${type}`)
    console.log(`  Stack: ${stack.join(', ')}`)
    console.log(`  Standard: ${config.project.standard}`)
    console.log(`\n  Next: define your idea and run "devsteps run"`)
  })

program.command('run')
  .description('Run the pipeline from current or specified step')
  .option('--step <id>', 'Start from a specific step')
  .action(async (options) => {
    const root = process.cwd()
    const config = loadConfig(root)
    if (!config) {
      console.log('No devsteps.yaml found. Run "devsteps init" first.')
      return
    }

    const pipelineDef = {
      id: 'active-pipeline',
      name: config.project.name,
      description: `Pipeline for ${config.project.name}`,
      type: config.project.type,
      standard: config.project.standard,
      version: config.project.version,
      steps: config.pipeline,
    }

    let savedContext: PipelineContext | null = null
    const savedData = loadContextFromDisk(root, 'context')
    if (savedData) savedContext = savedData as unknown as PipelineContext

    const runner = new PipelineRunner({
      steps: pipelineDef.steps,
      metadata: { projectName: config.project.name, projectType: config.project.type },
      executeSystem: async (systemId, sysConfig, ctx) => {
        if (systemId === 'human') {
          const stepDef = config.pipeline.find(s => s.id === ctx.currentStep)
          sysConfig.instructions = sysConfig.instructions ?? stepDef?.description
        }
        return executeSystem(systemId, sysConfig, ctx)
      },
      onCheckpoint: async (ctx) => {
        saveContextToDisk(ctx as unknown as Record<string, unknown>, root, 'context')
      },
    })

    const report = await runner.run(options.step)
    console.log(formatPipelineReport(report))

    if (report.status === 'paused') {
      console.log('\nPipeline paused. Run "devsteps resume" to continue.')
    }
  })

program.command('resume')
  .description('Resume a paused pipeline')
  .action(async () => {
    const root = process.cwd()
    const config = loadConfig(root)
    if (!config) {
      console.log('No devsteps.yaml found.')
      return
    }

    const savedData = loadContextFromDisk(root, 'context')
    if (!savedData) {
      console.log('No saved context found. Run "devsteps run" to start fresh.')
      return
    }

    const savedContext = savedData as unknown as PipelineContext
    if (savedContext.status !== 'paused') {
      console.log(`Pipeline status is "${savedContext.status}", not paused. Nothing to resume.`)
      return
    }

    const runner = new PipelineRunner({
      steps: config.pipeline,
      metadata: savedContext.metadata,
      executeSystem: async (systemId, sysConfig, ctx) => {
        return executeSystem(systemId, sysConfig, ctx)
      },
      onCheckpoint: async (ctx) => {
        saveContextToDisk(ctx as unknown as Record<string, unknown>, root, 'context')
      },
    })

    const report = await runner.run(savedContext.currentStep)
    console.log(formatPipelineReport(report))
  })

program.command('status')
  .description('Show current pipeline status')
  .action(() => {
    const root = process.cwd()
    const config = loadConfig(root)
    if (!config) {
      console.log('No devsteps.yaml found. Run "devsteps init" first.')
      return
    }

    const savedData = loadContextFromDisk(root, 'context')
    if (!savedData) {
      console.log('No pipeline running. Run "devsteps run" to start.')
      return
    }

    console.log(formatContext(savedData as unknown as PipelineContext))
  })

program.command('step:complete')
  .description('Mark current step as complete and advance')
  .option('--id <id>', 'Step ID to complete')
  .action((options) => {
    const root = process.cwd()
    const savedData = loadContextFromDisk(root, 'context')
    if (!savedData) {
      console.log('No active pipeline.')
      return
    }

    const ctx = savedData as unknown as PipelineContext
    const stepId = options.id ?? ctx.currentStep
    if (!ctx.completedSteps.includes(stepId)) {
      ctx.completedSteps.push(stepId)
    }
    ctx.status = 'running'
    saveContextToDisk(ctx as unknown as Record<string, unknown>, root, 'context')
    console.log(`Step ${stepId} marked complete. Run "devsteps run" to continue.`)
  })

program.command('step:fail')
  .description('Mark current step as failed')
  .option('--id <id>', 'Step ID to fail')
  .option('--next <id>', 'Next step or redirect target')
  .action((options) => {
    const root = process.cwd()
    const savedData = loadContextFromDisk(root, 'context')
    if (!savedData) {
      console.log('No active pipeline.')
      return
    }

    const ctx = savedData as unknown as PipelineContext
    ctx.status = 'failed'
    saveContextToDisk(ctx as unknown as Record<string, unknown>, root, 'context')
    console.log(`Step ${options.id ?? ctx.currentStep} marked as failed.`)
    if (options.next) console.log(`Redirecting to: ${options.next}`)
  })

program.command('validate')
  .description('Validate project artifacts against DS-v1 standard')
  .option('--file <path>', 'Validate a specific file')
  .option('--category <category>', 'Filter norms by category')
  .action((options) => {
    const root = process.cwd()
    const norms = options.category
      ? getNormsByCategory(options.category)
      : DS_V1.norms

    if (options.file) {
      const filePath = resolve(root, options.file)
      if (!existsSync(filePath)) {
        console.log(`File not found: ${filePath}`)
        return
      }
      const results = norms.map(n => validateFileAgainstNorm(filePath, n)).filter(r => r.result !== 'pass')
      console.log(formatNormChecks(results))
    } else {
      const results = validateProjectAgainstStandard(root, norms)
      console.log(formatNormChecks(results))
    }
  })

program.command('evaluate')
  .description('Evaluate an idea using the Viability Matrix')
  .option('--scores <items...>', 'Scores: technical=a,b,c economic=a,b,c temporal=a,b risk=a,b,c')
  .option('--interactive', 'Interactive mode with prompts')
  .action(async (options) => {
    const cfg = getViabilityConfig()

    if (options.interactive || !options.scores) {
      const answers: Record<string, number[]> = {}
      for (const dim of cfg.dimensions) {
        console.log(`\n--- ${dim.name} ---`)
        const dimAnswers: number[] = []
        for (const crit of dim.criteria) {
          const { score } = await inquirer.prompt([{
            type: 'number',
            name: 'score',
            message: `${crit.name} (${crit.description}) [${crit.scale[0]}-${crit.scale[1]}]:`,
            default: 3,
            validate: (v: number) => v >= crit.scale[0] && v <= crit.scale[1],
          }])
          dimAnswers.push(score)
        }
        answers[dim.id] = dimAnswers
      }
      const result = evaluateViability(answers)
      console.log(formatViabilityResult(result.scores, result.weighted, result.verdict))
      return
    }

    if (options.scores) {
      const parsed: Record<string, number[]> = {}
      for (const entry of options.scores) {
        const [key, values] = entry.split('=')
        if (key && values) parsed[key] = values.split(',').map(Number)
      }
      const result = evaluateViability(parsed)
      console.log(formatViabilityResult(result.scores, result.weighted, result.verdict))
    }
  })

program.command('launch')
  .description('Launch the system assigned to a specific step')
  .requiredOption('--step <id>', 'Step ID to launch')
  .option('--system <id>', 'Override the system to launch')
  .action(async (options) => {
    const root = process.cwd()
    const config = loadConfig(root)
    if (!config) {
      console.log('No devsteps.yaml found.')
      return
    }

    const step = config.pipeline.find(s => s.id === options.step)
    if (!step) {
      console.log(`Step "${options.step}" not found in pipeline.`)
      console.log(`Available steps: ${config.pipeline.map(s => s.id).join(', ')}`)
      return
    }

    const systemId = options.system ?? step.roles.execute[0]
    console.log(`Launching ${systemId} for step "${step.id}: ${step.name}"...`)
    console.log(`---`)
    console.log(`Description: ${step.description}`)
    console.log(`Entry criteria: ${step.entryCriteria?.join(', ') ?? 'none'}`)
    console.log(`Exit criteria: ${step.exitCriteria?.join(', ') ?? 'none'}`)
    console.log(`Output: ${step.output?.join(', ') ?? 'none'}`)
    console.log(`---`)
    console.log(`Run the appropriate tool to complete this step.`)
  })

program.command('pipeline:list')
  .description('List available pipeline types')
  .action(() => {
    console.log('Available pipeline types:')
    for (const type of getAvailablePipelineTypes()) {
      console.log(`  - ${type}`)
    }
  })

program.command('pipeline:export')
  .description('Export pipeline definition as markdown')
  .action(() => {
    const root = process.cwd()
    const config = loadConfig(root)
    if (!config) {
      console.log('No devsteps.yaml found.')
      return
    }

    const lines = [
      `# Pipeline: ${config.project.name}`,
      '',
      `**Type:** ${config.project.type}`,
      `**Standard:** ${config.project.standard}`,
      `**Stack:** ${config.project.stack.join(', ')}`,
      '',
      '## Steps',
      '',
    ]

    for (const step of config.pipeline) {
      lines.push(`### ${step.id}: ${step.name}`)
      lines.push('')
      lines.push(`${step.description}`)
      lines.push('')
      lines.push(`- **Execute:** ${step.roles.execute.join(', ')}`)
      lines.push(`- **Approve:** ${step.roles.approve}`)
      if (step.entryCriteria?.length) lines.push(`- **Entry:** ${step.entryCriteria.join(', ')}`)
      if (step.exitCriteria?.length) lines.push(`- **Exit:** ${step.exitCriteria.join(', ')}`)
      if (step.output?.length) lines.push(`- **Output:** ${step.output.join(', ')}`)
      lines.push(`- **On success →** ${step.next.onSuccess}`)
      lines.push(`- **On failure →** ${step.next.onFailure}${step.next.onFailureTarget ? ` (→ ${step.next.onFailureTarget})` : ''}`)
      lines.push(`- **On partial →** ${step.next.onPartial}${step.next.onPartialTarget ? ` (→ ${step.next.onPartialTarget})` : ''}`)
      if (step.estimatedDuration) lines.push(`- **Duration:** ${step.estimatedDuration}`)
      lines.push('')
    }

    console.log(lines.join('\n'))
  })

program.command('standard:list')
  .description('List all norms in the DS-v1 standard')
  .option('--category <category>', 'Filter by category')
  .action((options) => {
    const norms = options.category ? getNormsByCategory(options.category) : DS_V1.norms
    const categories = [...new Set(norms.map(n => n.category))]

    for (const cat of categories) {
      console.log(`\n[${cat.toUpperCase()}]`)
      for (const norm of norms.filter(n => n.category === cat)) {
        const sev = norm.severity === 'error' ? '🔴' : '🟡'
        console.log(`  ${sev} ${norm.id}: ${norm.name}`)
        console.log(`     ${norm.description}`)
      }
    }
  })

program.command('standard:check')
  .description('Validate a file against a specific norm')
  .requiredOption('--norm <id>', 'Norm ID (e.g., DS-010)')
  .requiredOption('--file <path>', 'File path to validate')
  .action((options) => {
    const norm = getNormById(options.norm)
    if (!norm) {
      console.log(`Norm "${options.norm}" not found.`)
      console.log(`Available norms: ${DS_V1.norms.map(n => n.id).join(', ')}`)
      return
    }

    const root = process.cwd()
    const filePath = resolve(root, options.file)
    if (!existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return
    }

    const result = validateFileAgainstNorm(filePath, norm)
    console.log(formatNormChecks([result]))
  })

program.command('system:list')
  .description('Detect and list all available systems/launchers')
  .action(async () => {
    console.log('Detecting local tools...\n')
    const detections = await detectAllTools()
    const env = getEnvironmentInfo()
    console.log(`Platform: ${env.platform} | Node: ${env.nodeVersion} | Shell: ${env.shell}\n`)

    for (const d of detections) {
      const icon = d.available ? '✓' : '✗'
      const modeTag = d.mode === 'direct-cli' ? '' : ` [${d.mode}]`
      console.log(`  ${icon} ${d.systemId}${modeTag}`)
      console.log(`     ${d.details}`)
      if (d.path) console.log(`     Path: ${d.path}`)
      if (d.version) console.log(`     Version: ${d.version}`)
      console.log()
    }
  })

program.command('doctor')
  .description('Diagnose devSteps environment, tools, and project health')
  .action(async () => {
    const root = process.cwd()
    const env = getEnvironmentInfo()
    const config = loadConfig(root)

    console.log('═══════════════════════════════════════')
    console.log('  DEVSTEPS DOCTOR')
    console.log('═══════════════════════════════════════')
    console.log(`\n📋 Environment`)
    console.log(`  Platform: ${env.platform}`)
    console.log(`  Node:     ${env.nodeVersion}`)
    console.log(`  Shell:    ${env.shell}`)
    console.log(`  Root:     ${root}`)

    console.log(`\n📋 Project`)
    if (config) {
      console.log(`  Name:     ${config.project.name}`)
      console.log(`  Type:     ${config.project.type}`)
      console.log(`  Stack:    ${config.project.stack.join(', ')}`)
      console.log(`  Standard: ${config.project.standard}`)
      console.log(`  Steps:    ${config.pipeline.length}`)
    } else {
      console.log(`  ⚠ No devsteps.yaml found. Run "devsteps init"`)
    }

    console.log(`\n📋 Tools`)
    const tools = await detectAllTools()
    for (const t of tools) {
      const icon = t.available ? '✓' : '✗'
      console.log(`  ${icon} ${t.systemId.padEnd(12)} ${t.version ? 'v' + t.version : '—'.padEnd(6)} ${t.path ?? t.mode}`)
    }

    const savedCtx = loadContextFromDisk(root, 'context')
    if (savedCtx) {
      console.log(`\n📋 Pipeline`)
      const ctx = savedCtx as unknown as PipelineContext
      console.log(`  Status:       ${ctx.status}`)
      console.log(`  Step:         ${ctx.currentStep || 'N/A'}`)
      console.log(`  Started:      ${ctx.startedAt}`)
      console.log(`  Artifacts:    ${ctx.artifacts.size}`)
      console.log(`  Completed:    ${ctx.completedSteps.length} steps`)
    }

    console.log(`\n📋 Standard`)
    const norms = DS_V1.norms
    const errors = norms.filter(n => n.severity === 'error').length
    const warnings = norms.filter(n => n.severity === 'warning').length
    console.log(`  ${DS_V1.name} — ${norms.length} norms (${errors} errors, ${warnings} warnings)`)
    console.log('═══════════════════════════════════════\n')
  })

program.command('inject')
  .description('Generate agent skill files (CLAUDE.md, .cursorrules, .windsurfrules, AGENTS.md)')
  .action(() => {
    const root = process.cwd()
    try {
      const result = runInject(root)
      console.log('Agent skill files generated:')
      for (const file of result.files) console.log(`  ✓ ${file}`)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exitCode = 1
    }
  })

program.command('checkpoint:save')
  .description('Save a manual checkpoint')
  .option('--label <text>', 'Checkpoint label')
  .action((options) => {
    const root = process.cwd()
    const savedData = loadContextFromDisk(root, 'context')
    if (!savedData) {
      console.log('No active pipeline context to save.')
      return
    }

    const ctx = savedData as unknown as PipelineContext
    const cp = {
      id: `manual-${Date.now()}`,
      pipelineId: ctx.pipelineId,
      stepId: ctx.currentStep,
      timestamp: new Date().toISOString(),
      context: ctx,
      label: options.label,
    }
    const path = saveCheckpointToDisk(cp, root)
    console.log(`Checkpoint saved: ${path}`)
  })

program.command('checkpoint:list')
  .description('List saved checkpoints')
  .action(() => {
    const root = process.cwd()
    const cps = listCheckpoints(root)
    if (cps.length === 0) {
      console.log('No checkpoints found.')
      return
    }
    console.log('Checkpoints:')
    for (const cp of cps) console.log(`  - ${cp}`)
  })

program.command('checkpoint:restore')
  .description('Restore from a checkpoint')
  .requiredOption('--id <id>', 'Checkpoint ID')
  .action((options) => {
    const root = process.cwd()
    const cp = loadCheckpointFromDisk(options.id, root)
    if (!cp) {
      console.log(`Checkpoint "${options.id}" not found.`)
      return
    }
    saveContextToDisk(cp.context as unknown as Record<string, unknown>, root, 'context')
    console.log(`Restored checkpoint: ${options.id}`)
    console.log(`Pipeline: ${cp.pipelineId}, Step: ${cp.stepId}`)
  })

// ── Fase 1: Guía Interactiva ──────────────────────────────────

program.command('guide')
  .description('Interactive guided mode — walk through the pipeline step by step')
  .option('--step <id>', 'Start from a specific step')
  .option('--auto', 'Non-interactive mode (auto-advance through steps)')
  .action(async (options) => {
    const root = process.cwd()
    try {
      await runGuide(root, options)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      if (program.opts().verbose && err instanceof Error) console.error(err.stack)
      process.exitCode = 1
    }
  })

program.command('watch')
  .description('Watch project files and validate DS-v1 norms in real time')
  .option('--category <category>', 'Filter validation to a specific category')
  .option('--poll <ms>', 'Debounce interval in milliseconds', '500')
  .action((options) => {
    const root = process.cwd()
    runWatch(root, { category: options.category, pollInterval: parseInt(options.poll) })
  })

program.command('scaffold')
  .description('Generate a complete project structure with source files, config, and tests')
  .option('--name <name>', 'Project name')
  .option('--type <type>', 'Project type (web-app, cli-tool, library, api-service, data-pipeline)')
  .option('--description <desc>', 'Project description')
  .option('--stack <items>', 'Tech stack (comma-separated, e.g. typescript,react,express)')
  .option('--force', 'Overwrite existing files')
  .action(async (options) => {
    const root = process.cwd()
    try {
      await runScaffold(root, {
        name: options.name,
        type: options.type,
        description: options.description,
        stack: options.stack,
        force: options.force,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exitCode = 1
    }
  })

program.command('explain')
  .description('Get detailed explanations for norms, steps, and categories')
  .option('--norm <id>', 'Explain a specific norm (e.g., DS-010)')
  .option('--step <id>', 'Explain a pipeline step (e.g., 4-develop)')
  .option('--category <cat>', 'Explain a norm category (e.g., security)')
  .option('--list', 'List all norms or filter by category')
  .action((options) => {
    runExplain(options)
  })

// ── Fase 2: Proactivo ─────────────────────────────────────────

program.command('hooks')
  .description('Install or remove git hooks for DS-v1 validation (pre-commit, pre-push, commit-msg)')
  .option('--install', 'Install git hooks')
  .option('--remove', 'Remove git hooks')
  .action((options) => {
    const root = process.cwd()
    if (!options.install && !options.remove) {
      console.log('Usage: devsteps hooks --install | --remove')
      return
    }
    runGitHooks(root, options)
  })

program.command('dashboard')
  .description('Display a real-time terminal dashboard showing pipeline status, progress, and norms')
  .option('--refresh <seconds>', 'Refresh interval in seconds', '5')
  .action((options) => {
    const root = process.cwd()
    runDashboard(root, { refresh: parseInt(options.refresh) })
  })

program.command('profile')
  .description('View the pipeline from a specific role perspective (dev, lead, devops, pm)')
  .argument('[profile]', 'Role profile (dev, lead, devops, pm)')
  .action((profile: string | undefined) => {
    const root = process.cwd()
    if (!profile) {
      listProfiles()
      return
    }
    runProfile(root, { profile })
  })

program.command('standard:custom')
  .description('Create, edit, and compile custom DS-v1 standards')
  .option('--create', 'Create a new custom standard from template')
  .option('--edit', 'View details of the current custom standard')
  .option('--compile', 'Compile and show the merged standard (base + custom)')
  .option('--name <name>', 'Custom standard file name (default: standard.yaml)')
  .action((options) => {
    const root = process.cwd()
    runCustomStandard(root, options)
  })

// ── Fase 3: Autónomo ──────────────────────────────────────────

program.command('autopilot')
  .description('Run the pipeline autonomously using AI agents with minimal human intervention')
  .option('--max-iterations <n>', 'Maximum iterations', '50')
  .option('--no-pause-on-failure', 'Continue even on step failures')
  .option('--pause-on-warning', 'Pause on DS-v1 warnings')
  .option('--headless', 'Skip human steps automatically (for CI/CD)')
  .action(async (options) => {
    const root = process.cwd()
    try {
      await runAutopilot(root, {
        maxIterations: parseInt(options.maxIterations),
        pauseOnFailure: options.pauseOnFailure !== false,
        pauseOnWarning: !!options.pauseOnWarning,
        headless: !!options.headless,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      if (program.opts().verbose && err instanceof Error) console.error(err.stack)
      process.exitCode = 1
    }
  })

program.command('history')
  .description('Show execution history and statistics across pipeline runs')
  .option('--limit <n>', 'Number of recent entries to show', '10')
  .option('--stats', 'Show aggregate statistics')
  .action((options) => {
    const root = process.cwd()
    showHistory(root, { limit: parseInt(options.limit), stats: options.stats })
  })

program.command('plugins')
  .description('Manage devSteps plugins: GitHub Actions, VS Code config, Slack notifications')
  .option('--install <type>', 'Install a plugin (github-actions, vscode, slack)')
  .option('--list', 'List installed plugins')
  .action((options) => {
    const root = process.cwd()
    if (!options.install && !options.list) {
      console.log('Usage: devsteps plugins --install <type> | --list')
      return
    }
    runPlugins(root, options)
  })

program.command('terminal')
  .description('Open a new terminal window running a devSteps command (guide, dashboard, watch, etc.)')
  .option('--command <cmd>', 'Command to run in the new terminal (guide, dashboard, watch, run, scaffold)', 'guide')
  .option('--cmd <str>', 'Full command string to execute (overrides --command)')
  .option('--no-stay', 'Close terminal immediately after command completes')
  .action((options) => {
    const root = process.cwd()
    openTerminal(root, {
      command: options.command,
      cmd: options.cmd,
      stay: options.stay !== false,
    })
  })

program.command('docs')
  .description('Generate project documentation from pipeline context (README, architecture, changelog, ADRs)')
  .option('--readme', 'Generate README.md')
  .option('--requirements', 'Generate docs/requirements.md')
  .option('--architecture', 'Generate docs/architecture.md')
  .option('--getting-started', 'Generate docs/getting-started.md')
  .option('--publishing', 'Generate docs/publishing.md')
  .option('--changelog', 'Generate CHANGELOG.md')
  .option('--decision <title>', 'Generate a new ADR with the given title')
  .option('--all', 'Generate all documentation')
  .action((options) => {
    const root = process.cwd()
    generateDocs(root, options)
  })

const ideasCmd = program.command('ideas')
  .description('SP-Ideas system: idea registration, evaluation, and approval')

ideasCmd.command('new')
  .description('Register a new idea')
  .action(() => cmdNew(process.cwd()))

ideasCmd.command('list')
  .description('List all registered ideas')
  .action(() => cmdList(process.cwd()))

ideasCmd.command('view <id>')
  .description('Show details of a specific idea')
  .action((id: string) => cmdView(process.cwd(), id))

ideasCmd.command('evaluate <id>')
  .description('Evaluate an idea using the viability matrix')
  .action((id: string) => cmdEvaluate(process.cwd(), id))

ideasCmd.command('prioritize')
  .description('Rank ideas by score')
  .action(() => cmdPrioritize(process.cwd()))

ideasCmd.command('approve <id>')
  .description('Approve an idea and create a devSteps project')
  .action((id: string) => cmdApprove(process.cwd(), id))

ideasCmd.command('reject <id>')
  .description('Reject an idea')
  .action((id: string) => cmdReject(process.cwd(), id))

ideasCmd.command('stats')
  .description('Show SP-Ideas statistics')
  .action(() => cmdStats(process.cwd()))

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  if (program.opts().verbose && error instanceof Error) console.error(error.stack)
  process.exitCode = 1
})
