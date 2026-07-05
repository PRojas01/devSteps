# Requirements — SP-devSteps

## Product Goal

Entregar una herramienta de orquestación de proyectos lista para producción y compartible en GitHub, enfocada en personas principiantes que necesitan una guía paso a paso y quieren aprender a trabajar con agentes de desarrollo dentro del stack compartido con `SP-DevControl`.

## Target User

- Persona que empieza prácticamente desde cero en proyectos de desarrollo.
- Persona que necesita instrucciones de configuración y uso sin saltos implícitos.
- Persona que quiere aprender a usar herramientas agénticas como Codex o Claude Code dentro de un flujo controlado.

## Functional Requirements

- Debe exponer un CLI instalable con comandos de inicialización, ejecución, validación y documentación.
- Debe ofrecer un modo guiado paso a paso para recorrer el pipeline.
- Debe generar archivos de contexto para agentes y editores.
- Debe permitir que el usuario interactúe directamente desde el CLI o indirectamente desde un editor agéntico mediante instrucciones generadas.
- Debe contemplar un tercer modo de integración mediante extensiones o MCP.
- Debe alinearse operativamente con `SP-DevControl` como herramienta hermana de gobernanza.
- Debe permitir generar documentación base de requisitos, arquitectura, ADR y publicación.
- Debe permitir configurar integraciones mínimas para GitHub Actions y VS Code.
- Debe validar artefactos del proyecto contra DS-v1.

## Non-Functional Requirements

- Debe ejecutarse en Node.js 20 o superior.
- Debe compilar con TypeScript estricto.
- Debe evitar secretos embebidos en código.
- Debe ser entendible para un usuario nuevo leyendo solo la documentación incluida.
- Debe soportar publicación como repositorio GitHub y distribución como CLI.

## Interaction Channels

- CLI directo: el usuario ejecuta comandos como `devsteps guide`, `devsteps validate` y `devsteps run`.
- Editor agéntico: el usuario conversa con Codex, Claude Code, Cursor, Windsurf u OpenCode, y el agente usa `AGENTS.md`, `CLAUDE.md`, `.cursorrules` o `.windsurfrules` para seguir el pipeline.

Ambos canales deben explicar el proceso y mantener control humano sobre avances, validaciones y decisiones.

## Supported Product Modes

### CLI instalable

- Superficie principal de uso.
- Pensado para terminal local, automatización y CI.

### Skill / agent instructions

- Superficie de contexto para Claude Code, Cursor, Windsurf y flujos similares.
- Se activa con `devsteps inject`.

### Extensión o MCP

- Superficie para conectar el proyecto con editores y herramientas externas.
- Incluye plugins básicos y ejemplo de configuración MCP.

### Integración con DevControl

- Debe poder convivir en el mismo proyecto con `sp-devcontrol`.
- Debe documentar claramente que `devSteps` orquesta el pipeline y `DevControl` aplica gobernanza.

## Success Criteria

- `npm run build` pasa.
- `npm run typecheck` pasa.
- `npm test` pasa.
- Existen `README.md`, `docs/requirements.md`, `docs/architecture.md`, `CHANGELOG.md` y `LICENSE`.
- Un usuario principiante puede seguir la guía sin depender de instrucciones externas.
