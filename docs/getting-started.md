# Getting Started

## Objetivo de esta guía

Ayudarte a usar `devSteps` aunque estés empezando desde cero, tanto en desarrollo general como en el uso de agentes como Codex o Claude Code.

## 1. Instala prerrequisitos

- Node.js 20 o superior
- Git
- Una terminal
- Opcional: Codex, Claude Code, OpenCode, Cursor o Windsurf

Guías específicas:

- [Instalación en Windows y Linux](install-platforms.md)
- [Codex, Claude Code, VS Code, Cursor, Windsurf, OpenCode y MCP](agentic-editors.md)

## 2. Instala SP-devSteps

```bash
npm install -g sp-devsteps
```

Para usar la copia local del repositorio:

```bash
npm install
npm run build
npm link
```

## 3. Crea tu primer proyecto

```bash
mkdir mi-primer-proyecto
cd mi-primer-proyecto
devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force
```

## 4. Verifica que el proyecto generado cumple el estándar

```bash
devsteps validate
```

## 5. Instala dependencias del proyecto generado

```bash
npm install
npm run build
npm test
```

## 6. Recorre la experiencia guiada

```bash
devsteps guide
```

Este es el punto de entrada recomendado si todavía no sabes bien en qué orden hacer las cosas.

Puedes trabajar de dos formas: directamente en la terminal con `devsteps guide`, `devsteps validate` y `devsteps run`, o desde un editor agéntico después de ejecutar `devsteps inject`.

## 7. Activa el modo skill para agentes

```bash
devsteps inject
```

Esto genera archivos que explican a los agentes cómo deben trabajar dentro del proyecto.

## 8. Activa la capa de gobernanza con DevControl

Si vas a trabajar con agentes reales, esta es la combinación recomendada:

```bash
git init
sp-devcontrol init
sp-devcontrol inject
sp-devcontrol project:check
```

Con esto el proyecto tendrá repositorio Git, contexto de pipeline y reglas/gates de gobernanza.

## 9. Configura el editor

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

## 10. Valida antes de avanzar

```bash
devsteps validate
```

## Flujo de trabajo recomendado

1. Crea el proyecto con `devsteps scaffold`.
2. Usa `devsteps guide`.
3. Inyecta `devsteps inject`.
4. Si habrá agentes, ejecuta `git init`, `sp-devcontrol init`, `sp-devcontrol inject` y revisa `sp-devcontrol project:check`.
5. Documenta diseño y arquitectura.
6. Ejecuta cambios.
7. Corre tests y validación.
8. Publica con commits convencionales.
