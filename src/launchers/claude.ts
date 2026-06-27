import { execa } from 'execa'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import type { SystemResult, PipelineContext } from '../types.js'
import { detectTool } from './detector.js'

export async function launchClaude(
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const cwd = (config.cwd as string) ?? process.cwd()
  const prompt = (config.prompt as string) ?? 'No prompt specified'
  const instructionsDir = resolve(cwd, '.devsteps/instructions/claude')

  const detection = await detectTool('claude')

  if (!detection.available) {
    return useFileBasedMode(instructionsDir, prompt, cwd)
  }

  const artifacts = [...context.artifacts.keys()]
  const fullPrompt = buildContextPrompt(prompt, artifacts, config)

  try {
    const { stdout, stderr, exitCode } = await execa('claude', ['-p', fullPrompt], {
      cwd,
      timeout: 600_000,
      reject: false,
    })

    return {
      systemId: 'claude',
      success: exitCode === 0,
      output: stdout || stderr,
      artifacts: config.output as string[] | undefined,
    }
  } catch (err) {
    return useFileBasedMode(instructionsDir, fullPrompt, cwd, err)
  }
}

function buildContextPrompt(base: string, artifacts: string[], config: Record<string, unknown>): string {
  const parts = [base]
  if (artifacts.length > 0) {
    parts.push('\n\nExisting artifacts:\n' + artifacts.map(a => `- ${a}`).join('\n'))
  }
  if (config.output) {
    parts.push('\n\nExpected output:\n' + (config.output as string[]).map(o => `- ${o}`).join('\n'))
  }
  return parts.join('\n')
}

function useFileBasedMode(
  dir: string, prompt: string, cwd: string, error?: unknown,
): SystemResult {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const timestamp = Date.now()
  const promptFile = join(dir, `prompt-${timestamp}.md`)
  const outputFile = join(dir, `output-${timestamp}.md`)

  const content = [
    '# devSteps: Claude Task',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Working directory: ${cwd}`,
    '',
    '## Task',
    '',
    prompt,
    '',
    '## Instructions',
    '',
    'Run: claude -p "' + prompt.slice(0, 100).replace(/"/g, '\\"') + '..."',
    '',
    'Or use the interactive session to complete this task.',
    '',
    'After completion, write results to:',
    `  ${outputFile}`,
    'Then run: devsteps step:complete --id <step-id>',
  ].join('\n')

  writeFileSync(promptFile, content, 'utf-8')

  const errorMsg = error instanceof Error ? error.message : undefined
  return {
    systemId: 'claude',
    success: false,
    error: errorMsg
      ? `claude falló: ${errorMsg}. Instrucciones guardadas en ${promptFile}`
      : `claude no disponible. Instrucciones guardadas en ${promptFile}`,
    output: content,
  }
}
