/** Module purpose: supports devSteps codex functionality. */
import { execa } from 'execa'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import type { SystemResult, PipelineContext } from '../types.js'
import { detectTool } from './detector.js'

export async function launchCodex(
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const cwd = (config.cwd as string) ?? process.cwd()
  const prompt = (config.prompt as string) ?? 'No prompt specified'
  const instructionsDir = resolve(cwd, '.devsteps/instructions/codex')

  const detection = await detectTool('codex')

  if (!detection.available) {
    return useFileBasedMode(instructionsDir, prompt, cwd)
  }

  const artifacts = [...context.artifacts.keys()]
  const fullPrompt = buildContextPrompt(prompt, artifacts, config)

  try {
    const { stdout, stderr, exitCode } = await execa('codex', ['exec', fullPrompt], {
      cwd,
      timeout: 600_000,
      reject: false,
    })

    return {
      systemId: 'codex',
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
    parts.push('\n\nContext artifacts:\n' + artifacts.map(a => `- ${a}`).join('\n'))
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

  const content = [
    '# devSteps: Codex Task',
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
    'Run interactively: codex',
    'Or non-interactively: codex exec "' + prompt.slice(0, 80).replace(/"/g, '\\"') + '..."',
    '',
    'After completion, run: devsteps step:complete --id <step-id>',
  ].join('\n')

  writeFileSync(promptFile, content, 'utf-8')

  const errorMsg = error instanceof Error ? error.message : undefined
  return {
    systemId: 'codex',
    success: false,
    error: errorMsg
      ? `codex falló: ${errorMsg}. Instrucciones guardadas en ${promptFile}`
      : `codex no disponible. Instrucciones guardadas en ${promptFile}`,
    output: content,
  }
}
