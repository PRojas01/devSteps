# Getting Started

## Objetivo de esta guía

Ayudarte a usar `devSteps` aunque estés empezando desde cero, tanto en desarrollo general como en el uso de agentes como Codex o Claude Code.

## 1. Instala prerrequisitos

- Node.js 20 o superior
- Git
- Una terminal
- Opcional: Codex, Claude Code, OpenCode, Cursor o Windsurf

## 2. Abre el proyecto

```bash
git clone <tu-repo>
cd devSteps
```

## 3. Instala dependencias

```bash
npm install
```

## 4. Verifica que todo funcione

```bash
npm run build
npm run typecheck
npm test
```

## 5. Instala el CLI localmente

```bash
npm link
devsteps --help
```

## 6. Recorre la experiencia guiada

```bash
devsteps guide
```

Este es el punto de entrada recomendado si todavía no sabes bien en qué orden hacer las cosas.

## 7. Genera documentación base

```bash
devsteps docs --all
```

## 8. Activa el modo skill para agentes

```bash
devsteps inject
```

Esto genera archivos que explican a los agentes cómo deben trabajar dentro del proyecto.

## 9. Activa la capa de gobernanza con DevControl

Si vas a trabajar con agentes reales, esta es la combinación recomendada:

```bash
sp-devcontrol inject
```

Con esto el proyecto tendrá contexto de pipeline y también reglas/gates de gobernanza.

## 10. Configura el editor

### VS Code

```bash
devsteps plugins --install vscode
```

### GitHub Actions

```bash
devsteps plugins --install github-actions
```

### OpenCode / MCP

Edita `opencode.json` según tu entorno para conectar servicios MCP.

## 11. Valida antes de avanzar

```bash
npm run validate
```

## Flujo de trabajo recomendado

1. Usa `devsteps guide`.
2. Inyecta `devsteps inject`.
3. Si habrá agentes, activa `sp-devcontrol inject`.
4. Documenta diseño y arquitectura.
5. Ejecuta cambios.
6. Corre tests y validación.
7. Publica con commits convencionales.
