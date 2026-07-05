# SP-devSteps

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Family](https://img.shields.io/badge/family-SolucionesPro%20Agentic%20Stack-blue)](#relacion-con-devcontrol)

`SP-devSteps` es el orquestador de ciclo de vida para proyectos asistidos por IA. Está diseñado para personas que quieren construir software con una ruta visible, repetible y compatible con agentes como Codex, Claude Code u OpenCode.

El enfoque no es "deja todo al agente". El enfoque es guiar a alguien que empieza desde cero para que pueda entender qué hacer, en qué orden y cómo validar que el proyecto sí está quedando listo para producción y para compartirlo.

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

### 1. CLI instalable

Uso principal en terminal:

```bash
npm install
npm run build
npm link
devsteps --help
```

### 2. Skill / instrucciones para agentes

Genera contexto reutilizable para herramientas como Claude Code, Cursor o Windsurf:

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

## Inicio rápido para principiantes

### 1. Instala prerrequisitos

- Node.js 20+
- Git
- Un editor o terminal
- Opcional: Codex, Claude Code, OpenCode, Cursor o Windsurf

### 2. Instala dependencias y verifica

```bash
npm install
npm run build
npm run typecheck
npm test
```

### 3. Recorre la guía principal

```bash
devsteps guide
```

### 4. Genera documentación base

```bash
devsteps docs --all
```

### 5. Inyecta instrucciones para agentes

```bash
devsteps inject
```

### 6. Si usarás gobernanza, conecta DevControl

```bash
sp-devcontrol inject
```

### 7. Valida el estado del proyecto

```bash
npm run validate
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
| `sp-devcontrol inject` | Inyectar gobernanza DevControl en el mismo proyecto |

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
- [Requisitos](docs/requirements.md)
- [Arquitectura](docs/architecture.md)
- [Publicación](docs/publishing.md)
- [Contribución](CONTRIBUTING.md)
- [Seguridad](SECURITY.md)

## Estado actual de release

El proyecto compila y sus tests pasan. La documentación base para onboarding, release y publicación en GitHub está incluida en este repositorio, y la integración con `SP-DevControl` queda documentada para uso conjunto.

## Licencia

MIT
