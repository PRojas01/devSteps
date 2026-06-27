import { execa, execaSync } from 'execa'
import { existsSync, readFileSync } from 'fs'
import { homedir, platform } from 'os'
import { join } from 'path'
import type { ToolDetection, SystemId, IntegrationMode, Platform } from '../types.js'

const NVM_DIR = join(homedir(), '.nvm/versions/node')
const NODE_BIN = join(homedir(), 'node_modules/.bin')
const CARGO_BIN = join(homedir(), '.cargo/bin')
const LOCAL_BIN = '/usr/local/bin'
const USER_BIN = join(homedir(), '.local/bin')

const SEARCH_PATHS = [NVM_DIR, NODE_BIN, CARGO_BIN, LOCAL_BIN, USER_BIN]

interface ToolCheck {
  id: SystemId
  binary: string
  versionArgs: string[]
  parseVersion: (out: string) => string | undefined
}

const TOOLS: ToolCheck[] = [
  {
    id: 'opencode',
    binary: 'opencode',
    versionArgs: ['--version'],
    parseVersion: (out) => out.match(/\d+\.\d+\.\d+/)?.[0],
  },
  {
    id: 'claude',
    binary: 'claude',
    versionArgs: ['--version'],
    parseVersion: (out) => out.match(/\d+\.\d+\.\d+/)?.[0],
  },
  {
    id: 'codex',
    binary: 'codex',
    versionArgs: ['--version'],
    parseVersion: (out) => out.match(/\d+\.\d+\.\d+/)?.[0],
  },
  {
    id: 'devcontrol',
    binary: 'sp-devcontrol',
    versionArgs: ['--version'],
    parseVersion: (out) => out.match(/\d+\.\d+\.\d+/)?.[0],
  },
]

export async function detectTool(toolId: SystemId): Promise<ToolDetection> {
  if (toolId === 'human') {
    return { systemId: 'human', available: true, mode: 'direct-cli', supportsNonInteractive: false, details: 'Human input via interactive prompts' }
  }
  if (toolId === 'auto') {
    return { systemId: 'auto', available: true, mode: 'direct-cli', supportsNonInteractive: true, details: 'Shell command executor (always available)' }
  }

  const tool = TOOLS.find(t => t.id === toolId)
  if (!tool) {
    return { systemId: toolId, available: false, mode: 'unavailable', supportsNonInteractive: false, details: `Unknown tool: ${toolId}` }
  }

  const whichResult = await findBinary(tool.binary)
  if (!whichResult) {
    const fileInstruction = `Instructions file generated at .devsteps/instructions/${toolId}/`
    return { systemId: toolId, available: false, mode: 'file-based', supportsNonInteractive: false, details: `${tool.binary} not found in PATH. ${fileInstruction}` }
  }

  const version = await getVersion(tool)
  const caps = await detectCapabilities(toolId, whichResult)

  return {
    systemId: toolId,
    available: true,
    mode: 'direct-cli',
    path: whichResult,
    version,
    supportsNonInteractive: caps.nonInteractive,
    details: caps.description,
  }
}

async function findBinary(name: string): Promise<string | undefined> {
  try {
    const { stdout, exitCode } = await execa('which', [name], { reject: false })
    if (exitCode === 0 && stdout.trim()) return stdout.trim()
  } catch {}
  for (const base of SEARCH_PATHS) {
    const candidate = join(base, name)
    if (existsSync(candidate)) return candidate
    const subdirs = ['', 'bin']
    for (const sub of subdirs) {
      try {
        const dir = join(base, sub)
        if (existsSync(dir)) {
          const entries = readFileSync(dir, 'utf-8').split('\n')
          if (entries.some(e => e.trim() === name)) return join(dir, name)
        }
      } catch {}
    }
  }
  return undefined
}

async function getVersion(tool: ToolCheck): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execa(tool.binary, tool.versionArgs, { reject: false })
    return tool.parseVersion(stdout || stderr)
  } catch {
    return undefined
  }
}

interface Capabilities {
  nonInteractive: boolean
  description: string
}

async function detectCapabilities(id: SystemId, binPath: string): Promise<Capabilities> {
  switch (id) {
    case 'opencode':
      return { nonInteractive: true, description: `Supports "opencode run <message>" for non-interactive execution` }
    case 'claude':
      return { nonInteractive: true, description: `Supports "claude -p <prompt>" for non-interactive execution` }
    case 'codex':
      return { nonInteractive: true, description: `Supports "codex exec <prompt>" for non-interactive execution` }
    case 'devcontrol':
      return { nonInteractive: true, description: `Full CLI governance via sp-devcontrol commands` }
    default:
      return { nonInteractive: false, description: `Tool: ${id}` }
  }
}

export async function detectAllTools(): Promise<ToolDetection[]> {
  const results: ToolDetection[] = []
  for (const tool of TOOLS) {
    results.push(await detectTool(tool.id))
  }
  results.push(await detectTool('human'))
  results.push(await detectTool('auto'))
  return results
}

export function getEnvironmentInfo(): { platform: Platform; nodeVersion: string; shell: string } {
  return {
    platform: platform() as Platform,
    nodeVersion: process.version,
    shell: process.env.SHELL ?? 'unknown',
  }
}
