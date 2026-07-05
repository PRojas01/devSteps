/** Module purpose: supports devSteps auto functionality. */
import { execa } from 'execa'
import type { SystemResult, PipelineContext } from '../types.js'

export async function launchAuto(
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const commands = config.commands as string[] ?? []
  if (config.command as string) commands.push(config.command as string)

  if (commands.length === 0) {
    return { systemId: 'auto', success: true, output: 'No commands to execute' }
  }

  const cwd = (config.cwd as string) ?? process.cwd()
  const results: string[] = []

  for (const cmd of commands) {
    try {
      const [prog, ...args] = cmd.split(' ')
      const { stdout, stderr, exitCode } = await execa(prog ?? cmd, args, {
        cwd,
        timeout: 120_000,
        reject: false,
        shell: true,
      })

      results.push(`$ ${cmd}\n${stdout}${stderr ? `\nSTDERR:\n${stderr}` : ''}`)

      if (exitCode !== 0 && config.stopOnError !== false) {
        return {
          systemId: 'auto',
          success: false,
          output: results.join('\n---\n'),
          error: `Command failed (exit ${exitCode}): ${cmd}`,
        }
      }
    } catch (err) {
      return {
        systemId: 'auto',
        success: false,
        error: `Command error: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  return {
    systemId: 'auto',
    success: true,
    output: results.join('\n---\n'),
  }
}
