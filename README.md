# SP-devSteps

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Family](https://img.shields.io/badge/family-SolucionesPro%20Agentic%20Stack-blue)](#relacion-con-devcontrol)

`SP-devSteps` es un orquestador de proyectos para gente que quiere empezar desde cero sin perder el control del proceso. Te da una ruta clara para crear, documentar, validar y publicar software, y funciona tanto en terminal como desde editores agénticos.

No reemplaza tu criterio. Te ayuda a aprender el flujo real de desarrollo mientras trabajas con herramientas como Codex, Claude Code, VS Code, Cursor, Windsurf u OpenCode.

## Qué problema resuelve

- Te dice qué hacer primero, qué validar después y cuándo estás listo para avanzar.
- Evita que dependas de instrucciones dispersas o de un agente que actúa sin contexto.
- Te deja trabajar desde la terminal o desde un editor agéntico con instrucciones ya preparadas.
- Documenta el proyecto para que puedas compartirlo, instalarlo y continuar más adelante sin empezar de nuevo.

## Relación con DevControl

`SP-devSteps` y `SP-DevControl` están pensados como herramientas hermanas:

- `SP-devSteps` define y guía el pipeline del proyecto.
- `SP-DevControl` gobierna la ejecución de agentes, cambios, aprobaciones y políticas.

En una instalación completa, `devSteps` orquesta y `DevControl` vigila.

## Qué incluye

- CLI instalable para crear, ejecutar, validar y documentar proyectos.
- Guía paso a paso para recorrer el pipeline completo.
- Generación de archivos de contexto para agentes y editores.
- Integraciones básicas para VS Code, GitHub Actions y entornos MCP.
- Estándar DS-v1 para documentación, setup, seguridad, testing y release.

## Tres modos principales

devSteps puede operar en dos canales de interacción: el usuario puede trabajar directamente en la terminal con el CLI, o puede trabajar desde un editor agéntico donde el agente lee las instrucciones generadas y guía el flujo dentro del proyecto.

### 1. CLI instalable

Uso principal en terminal:

```bash
npm install -g sp-devsteps
devsteps --help
```

### 2. Skill / instrucciones para agentes

Genera contexto reutilizable para herramientas como Codex, Claude Code, Cursor o Windsurf. Este modo permite que el usuario converse con el agente en el editor mientras el agente sigue el pipeline, DS-v1 y las instrucciones del proyecto:

```bash
devsteps inject
```

Archivos generados:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursorrules`
- `.windsurfrules`

### 3. Extensión o MCP

Preparación de entorno para editor o integración:

```bash
devsteps plugins --install vscode
devsteps plugins --install github-actions
```

También hay configuraciones de integración en `opencode.json` y `.mcp.json`, alineadas con DevControl.

## Inicio rápido

Si tu objetivo es aprender y avanzar paso a paso, esta es la ruta recomendada:

Si necesitas instrucciones por sistema operativo o editor, revisa:

- [Instalación en Windows y Linux](docs/install-platforms.md)
- [Codex, Claude Code, VS Code, Cursor, Windsurf, OpenCode y MCP](docs/agentic-editors.md)

### 1. Instala prerrequisitos

- Node.js 20+
- Git
- Un editor o terminal
- Opcional: Codex, Claude Code, OpenCode, Cursor o Windsurf

### 2. Instala el CLI

```bash
npm install -g sp-devsteps
```

Para probar desde este repositorio:

```bash
npm install
npm run build
npm link
```

### 3. Crea tu primer proyecto

```bash
mkdir mi-primer-proyecto
cd mi-primer-proyecto
devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force
```

### 4. Recorre la guía principal

```bash
devsteps guide
```

### 5. Inyecta instrucciones para agentes

```bash
devsteps inject
```

### 6. Si usarás gobernanza, conecta DevControl

```bash
git init
sp-devcontrol init
sp-devcontrol inject
sp-devcontrol project:check
```

Con DevControl ganas validación adicional, políticas y una capa más clara de gobernanza cuando ya estás trabajando con agentes.

### 7. Valida el estado del proyecto

```bash
devsteps validate
```

### 8. Verifica el proyecto generado

```bash
npm install
npm run build
npm test
```

## Comandos más útiles

| Comando | Uso |
|---|---|
| `devsteps init` | Inicializar un proyecto |
| `devsteps guide` | Recorrer el pipeline con explicación |
| `devsteps run` | Ejecutar el pipeline |
| `devsteps validate` | Validar DS-v1 |
| `devsteps inject` | Generar archivos para agentes |
| `devsteps docs --all` | Generar documentación base |
| `devsteps plugins --install vscode` | Preparar VS Code |
| `devsteps plugins --install github-actions` | Preparar CI en GitHub |
| `sp-devcontrol init` | Inicializar gobernanza DevControl en el mismo proyecto |
| `sp-devcontrol inject` | Inyectar reglas de agentes de DevControl |

## Pipeline base

1. Validar idea
2. Diseñar
3. Inicializar
4. Desarrollar
5. Verificar
6. Revisar
7. Release
8. Mantener

## Documentación relevante

- [Guía inicial](docs/getting-started.md)
- [Instalación en Windows y Linux](docs/install-platforms.md)
- [Editores agénticos y MCP](docs/agentic-editors.md)
- [Requisitos](docs/requirements.md)
- [Arquitectura](docs/architecture.md)
- [Publicación](docs/publishing.md)
- [Contribución](CONTRIBUTING.md)
- [Seguridad](SECURITY.md)

## Estado actual de release

El proyecto compila, sus tests pasan y el paquete publicado incluye guías para Windows, Linux y editores agénticos. La integración con `SP-DevControl` queda documentada para uso conjunto.

## Licencia

MIT
