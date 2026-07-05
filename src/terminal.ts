/** Module purpose: supports devSteps terminal functionality. */
import { spawn, execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { getEnvironmentInfo } from './launchers/index.js'

interface TerminalOptions {
  command?: string
  cmd?: string
  stay?: boolean
}

function findCommand(candidates: string[]): string | null {
  for (const cmd of candidates) {
    try {
      execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf-8' })
      return cmd
    } catch {
      continue
    }
  }
  return null
}

function detectTerminalEmulator(): string | null {
  const terminals = [
    'x-terminal-emulator',
    'gnome-terminal',
    'konsole',
    'xfce4-terminal',
    'lxterminal',
    'urxvt',
    'rxvt',
    'xterm',
    'alacritty',
    'kitty',
    'wezterm',
    'foot',
    'termite',
    'st',
  ]
  return findCommand(terminals)
}

function linuxLaunch(workdir: string, cmdToRun: string, stayOpen: boolean): void {
  const terminal = detectTerminalEmulator()
  if (!terminal) {
    console.log(chalk.red('No terminal emulator found. Install xterm, gnome-terminal, or konsole.'))
    return
  }

  let fullCmd: string
  const escapedCmd = cmdToRun.replace(/'/g, "'\\''")
  const cdCmd = `cd '${workdir.replace(/'/g, "'\\''")}'`

  if (terminal === 'gnome-terminal') {
    const bashCmd = `${cdCmd} && ${escapedCmd}`
    const holdCmd = stayOpen ? `; echo ''; echo 'Presiona Enter para cerrar...'; read` : ''
    fullCmd = `${bashCmd}${holdCmd}`
    const proc = spawn('gnome-terminal', ['--', 'bash', '-c', fullCmd], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    console.log(chalk.green(`  ✓ Terminal abierta: gnome-terminal → ${cmdToRun}`))
    return
  }

  if (terminal === 'konsole') {
    const bashCmd = `${cdCmd} && ${escapedCmd}`
    const holdCmd = stayOpen ? `; echo ''; echo 'Presiona Enter para cerrar...'; read` : ''
    fullCmd = `${bashCmd}${holdCmd}`
    const proc = spawn('konsole', ['--hold', '-e', 'bash', '-c', fullCmd], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    console.log(chalk.green(`  ✓ Terminal abierta: konsole → ${cmdToRun}`))
    return
  }

  const holdOpt = terminal === 'xterm' ? '-hold' : ''
  const holdFlag = stayOpen && holdOpt ? [holdOpt] : []
  const fullBashCmd = `${cdCmd} && ${escapedCmd}`
  const finalCmd = stayOpen
    ? `bash -c '${fullBashCmd}; echo ""; echo "Presiona Enter para cerrar..."; read'`
    : `bash -c '${fullBashCmd}'`

  try {
    const proc = spawn(terminal, [...holdFlag, '-e', finalCmd], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    console.log(chalk.green(`  ✓ Terminal abierta: ${terminal} → ${cmdToRun}`))
  } catch {
    console.log(chalk.red(`Error launching ${terminal}`))
  }
}

function macLaunch(workdir: string, cmdToRun: string, stayOpen: boolean): void {
  const escapedCmd = cmdToRun.replace(/"/g, '\\"')
  const holdCmd = stayOpen
    ? `; echo ''; echo 'Presiona Enter para cerrar...'; read`
    : ''
  const appleScript = `tell application "Terminal" to do script "cd \\"${workdir}\\" && ${escapedCmd}${holdCmd}"`
  try {
    const proc = spawn('osascript', ['-e', appleScript], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    console.log(chalk.green('  ✓ Terminal.app abierta'))
  } catch {
    console.log(chalk.red('Error launching Terminal.app'))
  }
}

function winLaunch(workdir: string, cmdToRun: string, stayOpen: boolean): void {
  const holdCmd = stayOpen ? ' & pause' : ''
  const fullCmd = `cd /d "${workdir}" && ${cmdToRun}${holdCmd}`
  try {
    const proc = spawn('cmd.exe', ['/c', 'start', 'devSteps', 'cmd.exe', '/k', fullCmd], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    console.log(chalk.green('  ✓ Terminal abierta: cmd.exe'))
  } catch {
    console.log(chalk.red('Error launching cmd.exe'))
  }
}

export function openTerminal(root: string, options: TerminalOptions): void {
  const config = loadConfig(root)

  const command = options.command ?? 'guide'
  const cmdToRun = options.cmd ?? `npx devsteps ${command}`
  const stayOpen = options.stay ?? true

  const availableCommands = [
    'guide', 'dashboard', 'watch', 'run', 'scaffold', 'status',
  ]

  if (!availableCommands.includes(command)) {
    console.log(chalk.red(`Comando no disponible para terminal: ${command}`))
    console.log(chalk.dim(`Disponibles: ${availableCommands.join(', ')}`))
    return
  }

  if (!config && command !== 'scaffold') {
    console.log(chalk.yellow('No hay devsteps.yaml. Se abrirá terminal para "devsteps scaffold" primero.'))
  }

  const env = getEnvironmentInfo()
  console.log(chalk.bold(`\n  🖥  devSteps Terminal Launcher`))
  console.log(chalk.dim(`  Comando: ${cmdToRun}`))

  switch (env.platform) {
    case 'linux':
      linuxLaunch(root, cmdToRun, stayOpen)
      break
    case 'darwin':
      macLaunch(root, cmdToRun, stayOpen)
      break
    case 'win32':
      winLaunch(root, cmdToRun, stayOpen)
      break
    default:
      console.log(chalk.red(`Plataforma no soportada: ${env.platform}`))
      return
  }

  console.log(chalk.dim('  La terminal se abrió en una ventana separada.'))
  console.log('')
}
