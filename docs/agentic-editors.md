# Agentic Editors and AI Coding Tools

`SP-devSteps` puede usarse directamente desde el CLI o desde un editor agéntico. El flujo recomendado es preparar el proyecto con `devsteps inject` para que el agente lea las reglas del pipeline y no trabaje a ciegas.

## Preparación común

Ejecuta esto en la raíz de tu proyecto:

```bash
devsteps scaffold --name "Mi Proyecto" --type web-app --stack typescript,node --force
devsteps inject
devsteps validate
```

Archivos generados para agentes:

- `AGENTS.md`: instrucciones generales para Codex y otros agentes compatibles.
- `CLAUDE.md`: instrucciones específicas para Claude Code.
- `.cursorrules`: reglas para Cursor.
- `.windsurfrules`: reglas para Windsurf.
- `.devsteps/pipeline-summary.md`: resumen del pipeline para humanos y agentes.

Si usas DevControl:

```bash
git init
sp-devcontrol init
sp-devcontrol inject
sp-devcontrol project:check
```

## Codex CLI

Verifica instalación:

```bash
codex --version
codex doctor
```

Uso interactivo dentro del proyecto:

```bash
cd mi-primer-proyecto
codex
```

Prompt inicial recomendado:

```text
Lee AGENTS.md y devsteps.yaml. Guíame paso a paso con devSteps. Antes de modificar archivos, dime en qué paso del pipeline estamos y qué validación ejecutarás.
```

Uso no interactivo:

```bash
codex exec "Lee AGENTS.md y devsteps.yaml. Revisa el estado del proyecto y sugiere el siguiente paso sin modificar archivos."
```

## Claude Code

Verifica instalación:

```bash
claude --version
claude doctor
```

Uso interactivo dentro del proyecto:

```bash
cd mi-primer-proyecto
claude
```

Prompt inicial recomendado:

```text
Lee CLAUDE.md y devsteps.yaml. Actúa como asistente de desarrollo guiado por devSteps. Mantén control humano antes de cambios importantes.
```

Uso no interactivo:

```bash
claude -p "Lee CLAUDE.md y devsteps.yaml. Resume el estado del pipeline y el siguiente paso recomendado."
```

## VS Code

Prepara configuración base:

```bash
devsteps plugins --install vscode
devsteps inject
```

Uso recomendado:

- Abre la carpeta del proyecto en VS Code.
- Usa la terminal integrada para `devsteps guide`, `devsteps validate` y `npm test`.
- Si usas una extensión de agente, pídele que lea `AGENTS.md` antes de modificar archivos.

Prompt recomendado:

```text
Usa AGENTS.md como instrucciones del proyecto. Trabaja paso a paso con devsteps.yaml y ejecuta devsteps validate antes de cerrar una tarea.
```

## Cursor

Prepara reglas:

```bash
devsteps inject
```

Cursor leerá `.cursorrules` en la raíz del proyecto. Si el agente no lo toma automáticamente, usa este prompt:

```text
Lee .cursorrules, AGENTS.md y devsteps.yaml. Ayúdame a completar el siguiente paso del pipeline sin saltarte validaciones.
```

## Windsurf

Prepara reglas:

```bash
devsteps inject
```

Windsurf leerá `.windsurfrules` en la raíz del proyecto. Prompt recomendado:

```text
Lee .windsurfrules, AGENTS.md y devsteps.yaml. Guía el trabajo por etapas y valida con devsteps validate.
```

## OpenCode

Verifica instalación:

```bash
opencode --version
opencode providers
```

Uso interactivo:

```bash
opencode .
```

Uso no interactivo:

```bash
opencode run "Lee AGENTS.md y devsteps.yaml. Revisa el estado del proyecto y recomienda el siguiente paso."
```

## MCP

El repositorio incluye `.mcp.json` y `opencode.json` como puntos de partida. Úsalos cuando tu editor o agente soporte servidores MCP.

Checklist:

- Mantén `.mcp.json` en la raíz del proyecto.
- Ejecuta `devsteps inject` después de cambiar el pipeline.
- Ejecuta `devsteps validate` antes de entregar cambios.
- Si usas DevControl, ejecuta `sp-devcontrol project:check` para revisar gobernanza.
