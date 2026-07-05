# Publishing

## Objetivo

Dejar `devSteps` listo para compartirse en GitHub y distribuirse como CLI.

## Checklist local

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run validate`
- Confirmar que `docs/install-platforms.md` cubre Windows y Linux
- Confirmar que `docs/agentic-editors.md` cubre Codex, Claude Code, VS Code, Cursor, Windsurf, OpenCode y MCP

## Publicación en GitHub

### 1. Crea el repositorio remoto

Crea un repositorio vacío en GitHub con el nombre que decidas para el proyecto.

### 2. Conecta el remoto

```bash
git remote add origin <url-del-repo>
git branch -M main
git push -u origin main
```

### 3. Activa CI base

```bash
devsteps plugins --install github-actions
```

Si prefieres dejarlo ya versionado en el repositorio, usa el workflow incluido en `.github/workflows/ci.yml`.

## Publicación coordinada con DevControl

Si `SP-devSteps` y `SP-DevControl` se publican como familia:

- `SP-devSteps` debe presentarse como orquestador del pipeline.
- `SP-DevControl` debe presentarse como capa de gobernanza.
- La documentación pública de ambos debe referenciar esta relación de forma consistente.

## Publicación del CLI

### Prueba local

```bash
npm run build
npm link
devsteps --help
```

### Publicación en npm

```bash
npm pack --dry-run
npm publish
```

## Release discipline

- Mantén SemVer en `package.json`.
- Actualiza `CHANGELOG.md`.
- Usa Conventional Commits.
- Registra decisiones relevantes en ADRs.
- Vuelve a ejecutar build, typecheck y tests antes de publicar.
