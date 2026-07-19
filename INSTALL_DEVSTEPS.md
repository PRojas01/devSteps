# Instalacion multi-editor de devSteps

`SP-devSteps` es un modulo CLI-first. La integracion universal se hace mediante el MCP local declarado en `.mcp.json`; no existe una API HTTP publica propia de devSteps ni un OpenAPI para ChatGPT web.

## Prerrequisitos

- Node.js 20 o superior.
- `sp-devsteps` instalado o este repositorio construido localmente.
- Para MCP: servidor local de DevControl disponible en `http://localhost:7893/mcp`.

Instalacion del CLI:

```bash
npm install -g sp-devsteps
devsteps --help
```

Uso desde este repositorio:

```bash
npm install
npm run build
npm link
devsteps --help
```

## Claude Code

Claude Code puede usar dos superficies:

- Skill: `.claude/skills/orchestrate-lifecycle/SKILL.md`.
- Plugin: `.claude-plugin/plugin.json`.

El plugin declara el MCP:

```json
{
  "mcpServers": {
    "devcontrol": {
      "type": "sse",
      "url": "http://localhost:7893/mcp"
    }
  }
}
```

Flujo recomendado dentro del proyecto:

```bash
devsteps inject
devsteps status
devsteps validate
```

Prompt inicial:

```text
Usa la skill orchestrate-lifecycle. Lee CLAUDE.md y devsteps.yaml, revisa el estado del pipeline y dime el siguiente paso antes de modificar archivos.
```

## Codex

Codex ya puede leer `AGENTS.md`. La configuracion esperada para `.codex/config.toml` es:

```toml
[mcp_servers.devcontrol]
url = "http://localhost:7893/mcp"
```

Alternativa manual equivalente:

```bash
codex mcp add devcontrol --url http://localhost:7893/mcp
```

Prompt inicial:

```text
Lee AGENTS.md y devsteps.yaml. Usa devSteps para guiar el pipeline, valida con devsteps validate y usa el MCP devcontrol si esta conectado.
```

## OpenCode

OpenCode usa `opencode.json`, ya incluido:

```json
{
  "mcp": {
    "devcontrol": {
      "type": "remote",
      "url": "http://localhost:7893/mcp",
      "enabled": true
    }
  }
}
```

Uso recomendado:

```bash
opencode .
```

Prompt inicial:

```text
Lee AGENTS.md y devsteps.yaml. Revisa el estado del pipeline y recomienda el siguiente paso.
```

## ChatGPT

devSteps es CLI-only. Para ChatGPT, la via soportada es ChatGPT Desktop con connector MCP apuntando al servidor local:

- Nombre: `devcontrol`
- Tipo: SSE o remote MCP, segun el cliente
- URL: `http://localhost:7893/mcp`

ChatGPT web con GPT Actions no aplica para devSteps porque no hay API HTTP propia que describir. No se provee `chatgpt/openapi.yaml`.

## CLI directo

Comandos principales:

```bash
devsteps scaffold --name "Mi Proyecto" --type web-app --stack typescript,node --force
devsteps guide
devsteps run
devsteps status
devsteps validate
devsteps inject
devsteps step:complete <id>
```

## Verificacion

Antes de entregar cambios de integracion:

```bash
node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('json ok')"
python3 - <<'PY'
import tomllib
tomllib.loads('[mcp_servers.devcontrol]\nurl = "http://localhost:7893/mcp"\n')
print('toml ok')
PY
test -f .mcp.json
devsteps validate
```
