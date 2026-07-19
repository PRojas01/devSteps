const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const VIEW_ID = 'devsteps.controlPanel'

function activate(context) {
  const output = vscode.window.createOutputChannel('devSteps')
  const provider = new DevStepsViewProvider(context.extensionUri, output)

  context.subscriptions.push(
    output,
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    vscode.commands.registerCommand('devsteps.status', () => provider.runCliCommand(['status'])),
    vscode.commands.registerCommand('devsteps.validate', () => provider.runCliCommand(['validate'])),
    vscode.commands.registerCommand('devsteps.run', () => provider.runCliCommand(['run'])),
    vscode.commands.registerCommand('devsteps.inject', () => provider.runCliCommand(['inject'])),
    vscode.commands.registerCommand('devsteps.registerMcp', () => provider.registerMcp()),
    vscode.commands.registerCommand('devsteps.openTerminal', () => openDevStepsTerminal())
  )
}

function deactivate() {}

class DevStepsViewProvider {
  constructor(extensionUri, output) {
    this.extensionUri = extensionUri
    this.output = output
    this.view = undefined
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }
    webviewView.webview.html = this.render(webviewView.webview)
    webviewView.webview.onDidReceiveMessage((message) => {
      if (!message || typeof message.command !== 'string') return
      if (message.command === 'registerMcp') {
        void this.registerMcp()
        return
      }
      const allowed = new Map([
        ['status', ['status']],
        ['validate', ['validate']],
        ['inject', ['inject']],
        ['run', ['run']],
      ])
      const args = allowed.get(message.command)
      if (args) void this.runCliCommand(args)
    })
  }

  async runCliCommand(args) {
    const workspaceRoot = getWorkspaceRoot()
    if (!workspaceRoot) {
      void vscode.window.showWarningMessage('Abre una carpeta de proyecto para ejecutar devSteps.')
      this.postResult('Sin carpeta abierta.')
      return
    }

    const cli = resolveCli(workspaceRoot)
    const title = `devsteps ${args.join(' ')}`
    this.output.appendLine(`$ ${title}`)
    this.postResult(`Ejecutando: ${title}`)

    try {
      const result = await runProcess(cli.command, [...cli.args, ...args], workspaceRoot)
      const text = result.stdout || result.stderr || 'Comando finalizado sin salida.'
      this.output.appendLine(text)
      this.postResult(text)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.output.appendLine(detail)
      this.postResult(detail)
      void vscode.window.showErrorMessage(`devSteps fallo: ${detail}`)
    }
  }

  async registerMcp() {
    const workspaceRoot = getWorkspaceRoot()
    if (!workspaceRoot) {
      void vscode.window.showWarningMessage('Abre una carpeta de proyecto para registrar MCP.')
      this.postResult('Sin carpeta abierta.')
      return
    }

    const mcpPath = path.join(workspaceRoot, '.mcp.json')
    const current = readJsonFile(mcpPath) || {}
    const mcpServers = current.mcpServers && typeof current.mcpServers === 'object'
      ? current.mcpServers
      : {}

    const next = {
      ...current,
      mcpServers: {
        ...mcpServers,
        devcontrol: {
          type: 'sse',
          url: 'http://localhost:7893/mcp',
        },
      },
    }

    fs.writeFileSync(mcpPath, `${JSON.stringify(next, null, 2)}\n`)
    this.postResult('MCP registrado en .mcp.json.')
    void vscode.window.showInformationMessage('devSteps MCP registrado en .mcp.json.')

    const document = await vscode.workspace.openTextDocument(mcpPath)
    await vscode.window.showTextDocument(document, { preview: false })
  }

  postResult(text) {
    if (!this.view) return
    this.view.webview.postMessage({ type: 'result', text })
  }

  render(webview) {
    const nonce = getNonce()
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>devSteps</title>
  <style>
    :root {
      color-scheme: light dark;
      --border: color-mix(in srgb, var(--vscode-foreground) 20%, transparent);
      --muted: color-mix(in srgb, var(--vscode-foreground) 65%, transparent);
    }
    body {
      margin: 0;
      padding: 14px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
      gap: 8px;
    }
    button {
      min-height: 36px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      font: inherit;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    .secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    pre {
      min-height: 180px;
      margin: 14px 0 0;
      padding: 10px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
    }
    .status {
      margin-top: 10px;
      color: var(--muted);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>SP-devSteps</h1>
  <div class="grid">
    <button data-command="status" title="devsteps status">Estado</button>
    <button data-command="validate" title="devsteps validate">Validar</button>
    <button data-command="inject" title="devsteps inject">Inyectar</button>
    <button data-command="run" title="devsteps run">Ejecutar</button>
    <button class="secondary" data-command="registerMcp" title="Registrar .mcp.json">MCP</button>
  </div>
  <div class="status" id="status">Listo</div>
  <pre id="output" aria-live="polite"></pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const status = document.getElementById('status');
    const output = document.getElementById('output');
    document.querySelectorAll('button[data-command]').forEach((button) => {
      button.addEventListener('click', () => {
        status.textContent = 'Ejecutando...';
        vscode.postMessage({ command: button.dataset.command });
      });
    });
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'result') return;
      status.textContent = 'Finalizado';
      output.textContent = event.data.text;
    });
  </script>
</body>
</html>`
  }
}

function getWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders
  return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined
}

function resolveCli(workspaceRoot) {
  const localDist = path.join(workspaceRoot, 'dist', 'cli.js')
  if (fs.existsSync(localDist)) {
    return { command: process.execPath, args: [localDist] }
  }

  const binName = process.platform === 'win32' ? 'devsteps.cmd' : 'devsteps'
  const localBin = path.join(workspaceRoot, 'node_modules', '.bin', binName)
  if (fs.existsSync(localBin)) {
    return { command: localBin, args: [] }
  }

  return { command: binName, args: [] }
}

function runProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error((stderr || stdout || `Comando finalizo con codigo ${code}`).trim()))
    })
  })
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return undefined
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return undefined
  }
}

function openDevStepsTerminal() {
  const workspaceRoot = getWorkspaceRoot()
  const terminal = vscode.window.createTerminal({
    name: 'devSteps',
    cwd: workspaceRoot,
  })
  terminal.show()
  terminal.sendText('devsteps --help')
}

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let nonce = ''
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return nonce
}

module.exports = {
  activate,
  deactivate,
}

