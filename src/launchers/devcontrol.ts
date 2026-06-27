import { execa } from 'execa'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import type { SystemResult, PipelineContext } from '../types.js'
import { detectTool } from './detector.js'

interface DevcontrolSession {
  id: string
  objective: string
  status: 'active' | 'closed'
  watchPid?: number
  approved: number
  rejected: number
  pending: number
}

export async function launchDevcontrol(
  config: Record<string, unknown>,
  context: PipelineContext,
): Promise<SystemResult> {
  const cwd = (config.cwd as string) ?? process.cwd()
  const action = (config.action as string) ?? 'session:start'
  const objective = (config.objective as string) ?? 'Governed development'
  const stateDir = resolve(cwd, '.devsteps/devcontrol')

  const detection = await detectTool('devcontrol')

  if (!detection.available) {
    const sessionFile = writeDevcontrolInstructions(stateDir, action, objective, cwd)
    return {
      systemId: 'devcontrol',
      success: false,
      error: `sp-devcontrol no instalado. Instrucciones guardadas en ${sessionFile}`,
    }
  }

  switch (action) {
    case 'session:start':
      return startSession(stateDir, objective, cwd, config)
    case 'watch:start':
      return startWatch(stateDir, cwd, config)
    case 'session:close':
      return closeSession(stateDir, cwd, config)
    case 'session:report':
      return sessionReport(stateDir, cwd, config)
    case 'validate':
      return runValidate(cwd, config)
    default:
      return { systemId: 'devcontrol', success: false, error: `Unknown action: ${action}` }
  }
}

async function startSession(
  stateDir: string, objective: string, cwd: string, config: Record<string, unknown>,
): Promise<SystemResult> {
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true })

  const { stdout, exitCode } = await execa('sp-devcontrol', [
    'session:start',
    '--objective', objective,
    '--agent', (config.agent as string) ?? 'opencode',
    '--skip-preflight',
  ], { cwd, timeout: 30_000, reject: false })

  if (exitCode !== 0) {
    return { systemId: 'devcontrol', success: false, error: `session:start failed: ${stdout}` }
  }

  const sessionIdMatch = stdout?.match(/Session started: (\S+)/)
  const sessionId = sessionIdMatch?.[1] ?? `session-${Date.now()}`

  const session: DevcontrolSession = {
    id: sessionId, objective,
    status: 'active', approved: 0, rejected: 0, pending: 0,
  }
  writeFileSync(join(stateDir, 'active-session.json'), JSON.stringify(session, null, 2), 'utf-8')
  writeFileSync(join(stateDir, `session-${sessionId}.json`), JSON.stringify(session, null, 2), 'utf-8')

  return {
    systemId: 'devcontrol',
    success: true,
    output: stdout ?? `Session started: ${sessionId}`,
    artifacts: [`.devsteps/devcontrol/session-${sessionId}.json`],
  }
}

async function startWatch(
  stateDir: string, cwd: string, config: Record<string, unknown>,
): Promise<SystemResult> {
  const sessionFile = join(stateDir, 'active-session.json')
  if (!existsSync(sessionFile)) {
    return { systemId: 'devcontrol', success: false, error: 'No active session. Run session:start first.' }
  }

  const session: DevcontrolSession = JSON.parse(require('fs').readFileSync(sessionFile, 'utf-8'))

  try {
    const child = execa('sp-devcontrol', ['watch:start', '--session', session.id], {
      cwd,
      timeout: 5000,
      reject: false,
      detached: false,
    })

    const { stdout, stderr } = await child

    const approvedMatch = stdout?.match(/Approved: (\d+)/)
    const rejectedMatch = stdout?.match(/Rejected: (\d+)/)
    if (approvedMatch) session.approved = parseInt(approvedMatch[1], 10)
    if (rejectedMatch) session.rejected = parseInt(rejectedMatch[1], 10)

    writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf-8')

    return {
      systemId: 'devcontrol',
      success: true,
      output: stdout ?? stderr ?? 'Watch completed',
      artifacts: [`.devsteps/devcontrol/session-${session.id}.json`],
    }
  } catch {
    return {
      systemId: 'devcontrol',
      success: false,
      error: 'watch:start requiere atención manual. Corre: sp-devcontrol watch:start --session ' + session.id,
    }
  }
}

async function closeSession(
  stateDir: string, cwd: string, config: Record<string, unknown>,
): Promise<SystemResult> {
  const sessionFile = join(stateDir, 'active-session.json')
  if (!existsSync(sessionFile)) {
    return { systemId: 'devcontrol', success: false, error: 'No active session to close.' }
  }

  const sessionId = config.sessionId as string
    ?? JSON.parse(require('fs').readFileSync(sessionFile, 'utf-8')).id
  const status = (config.status as string) ?? 'completed'

  const { stdout, exitCode } = await execa('sp-devcontrol', [
    'session:close', '--session', sessionId, '--status', status,
  ], { cwd, timeout: 30_000, reject: false })

  if (exitCode === 0 && existsSync(sessionFile)) {
    require('fs').unlinkSync(sessionFile)
  }

  return {
    systemId: 'devcontrol',
    success: exitCode === 0,
    output: stdout ?? `Session ${sessionId} closed with status: ${status}`,
  }
}

async function sessionReport(
  stateDir: string, cwd: string, config: Record<string, unknown>,
): Promise<SystemResult> {
  const sessionId = config.sessionId as string
  if (!sessionId) return { systemId: 'devcontrol', success: false, error: 'No session ID provided.' }

  const { stdout, exitCode } = await execa('sp-devcontrol', [
    'report:session', '--session', sessionId,
  ], { cwd, timeout: 30_000, reject: false })

  if (exitCode === 0 && stdout) {
    writeFileSync(join(stateDir, `report-${sessionId}.md`), stdout, 'utf-8')
  }

  return {
    systemId: 'devcontrol',
    success: exitCode === 0,
    output: stdout ?? `Report generated for session ${sessionId}`,
    artifacts: [`.devsteps/devcontrol/report-${sessionId}.md`],
  }
}

async function runValidate(cwd: string, config: Record<string, unknown>): Promise<SystemResult> {
  const target = (config.target as string) ?? ''
  const args = ['validate']
  if (config.category) args.push('--category', config.category as string)
  if (config.file) args.push('--file', config.file as string)

  const { stdout, exitCode } = await execa('sp-devcontrol', args, { cwd, timeout: 60_000, reject: false })

  return {
    systemId: 'devcontrol',
    success: exitCode === 0,
    output: stdout ?? 'Project validated',
  }
}

function writeDevcontrolInstructions(stateDir: string, action: string, objective: string, cwd: string): string {
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true })
  const file = join(stateDir, 'instructions.md')
  const content = [
    '# DevControl Instructions',
    '',
    `Action: ${action}`,
    `Objective: ${objective}`,
    `Directory: ${cwd}`,
    '',
    '## Manual Steps',
    '',
    '1. Install DevControl: npm install -g sp-devcontrol',
    '2. Run: sp-devcontrol init',
    '3. Run: sp-devcontrol session:start --objective "' + objective + '"',
    '4. Run: sp-devcontrol watch:start --session <id>',
    '',
  ].join('\n')
  writeFileSync(file, content, 'utf-8')
  return file
}
