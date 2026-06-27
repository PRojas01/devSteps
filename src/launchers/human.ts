import inquirer from 'inquirer'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import type { SystemResult, PipelineContext } from '../types.js'

export async function launchHuman(
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const cwd = (config.cwd as string) ?? process.cwd()
  const instructions = (config.instructions as string) ?? 'Complete this step manually.'
  const artifacts = config.output as string[] | undefined
  const stepId = config.stepId as string ?? context.currentStep
  const stepName = config.stepName as string ?? stepId

  const artifactsList = [...context.artifacts.keys()]
  const instructionsDir = resolve(cwd, '.devsteps/instructions/human')
  if (!existsSync(instructionsDir)) mkdirSync(instructionsDir, { recursive: true })

  const instructionFile = join(instructionsDir, `step-${stepId}.md`)
  const instructionContent = [
    '# Human Step Required',
    '',
    `Step: ${stepId}`,
    `Name: ${stepName}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Task',
    '',
    instructions,
    '',
    artifacts ? '## Expected Output\n' + artifacts.map(a => `- ${a}`).join('\n') : '',
    '',
    artifactsList.length > 0 ? '## Context Artifacts\n' + artifactsList.map(a => `- ${a}`).join('\n') : '',
    '',
    '## After Completing',
    'Run: devsteps step:complete --id ' + stepId,
  ].join('\n')
  writeFileSync(instructionFile, instructionContent, 'utf-8')

  console.log('\n' + '='.repeat(64))
  console.log('  👤 HUMAN STEP REQUIRED')
  console.log('='.repeat(64))
  console.log(`  Step: ${stepId} — ${stepName}`)
  console.log(`  ${'─'.repeat(60)}`)
  console.log(`  ${instructions}`)
  if (artifacts && artifacts.length > 0) {
    console.log(`  ${'─'.repeat(60)}`)
    console.log('  Expected output:')
    for (const a of artifacts) console.log(`    • ${a}`)
  }
  console.log(`  ${'─'.repeat(60)}`)
  console.log(`  Instructions saved: ${instructionFile}`)
  console.log('='.repeat(64))

  const response = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'completed',
      message: 'Did you complete this step?',
      default: false,
    },
    {
      type: 'input',
      name: 'notes',
      message: 'Notes or comments:',
      when: (a) => a.completed,
    },
    {
      type: 'input',
      name: 'artifactsProduced',
      message: 'Artifacts produced (comma-separated):',
      when: (a) => a.completed,
    },
    {
      type: 'list',
      name: 'action',
      message: 'What now?',
      choices: ['Complete step', 'Skip step', 'Defer (pause pipeline)'],
      when: (a) => !a.completed,
    },
  ])

  if (!response.completed) {
    if (response.action === 'Skip step') {
      return { systemId: 'human', success: true, output: 'Step skipped by user', artifacts: [] }
    }
    return { systemId: 'human', success: false, error: 'Step deferred by user' }
  }

  const produced = response.artifactsProduced
    ? response.artifactsProduced.split(',').map((s: string) => s.trim())
    : (artifacts ?? [])

  writeFileSync(instructionFile.replace('.md', '-completed.md'), [
    '# Human Step Completed',
    '',
    `Step: ${stepId}`,
    `Completed: ${new Date().toISOString()}`,
    '',
    `Notes: ${response.notes ?? 'N/A'}`,
    '',
    'Artifacts:',
    ...produced.map((a: string) => `- ${a}`),
  ].join('\n'), 'utf-8')

  return {
    systemId: 'human',
    success: true,
    output: response.notes ?? 'Step completed by human',
    artifacts: produced,
  }
}
