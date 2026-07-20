# SP-devSteps Editor Extension

Extensión VSIX para usar `devsteps` desde una pestaña dentro de VS Code, Cursor o Windsurf.

## Prerrequisitos

- Node.js 20 o superior.
- `devsteps` instalado globalmente, o este repositorio construido con `npm run build`.
- Para MCP, DevControl escuchando en `http://localhost:7893/mcp`.

## Empaquetar

```bash
cd extension
npm install
npx @vscode/vsce package
```

El comando genera un `.vsix` instalable con:

```bash
code --install-extension sp-devsteps-editor-1.0.0.vsix
```

Cursor y Windsurf aceptan el mismo paquete VSIX desde su instalador de extensiones compatible con VS Code.

## Panel

El contenedor `devSteps` aparece en la Activity Bar y expone comandos para:

- `devsteps status`
- `devsteps validate`
- `devsteps inject`
- `devsteps run`
- registrar `.mcp.json` con el MCP local de DevControl usado por devSteps.

La extensión no reimplementa la lógica del módulo; invoca el CLI y conserva MCP como integración universal.

