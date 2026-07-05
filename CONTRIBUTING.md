# Contributing to SP-devSteps

Gracias por contribuir. `SP-devSteps` forma parte de la misma familia de herramientas que `SP-DevControl`, pero su responsabilidad es distinta: aquí priorizamos orquestación, onboarding y flujo de proyecto.

## Cómo contribuir

### Reportar bugs

1. Describe el comando ejecutado.
2. Incluye versión de Node.js y sistema operativo.
3. Explica comportamiento esperado vs real.
4. Adjunta logs o salida relevante de `devsteps validate`, `npm test` o `npm run build`.

### Proponer funcionalidades

1. Explica el problema a resolver.
2. Indica si pertenece a pipeline, onboarding, docs, plugins o integración MCP.
3. Aclara si debería resolverse aquí o en `SP-DevControl`.

### Pull requests

1. Crea una rama desde `main`.
2. Mantén cambios acotados.
3. Añade o actualiza tests cuando cambie comportamiento.
4. Ejecuta:

```bash
npm run build
npm run typecheck
npm test
```

5. Usa Conventional Commits.

## Convenciones

- TypeScript estricto.
- Módulos ESM.
- Comentarios solo cuando agregan contexto real.
- Mantener separación entre engine, docs, standards e integrations.

## Límite entre proyectos hermanos

Usa `SP-devSteps` cuando el problema sea:

- pipeline
- generación documental
- guía paso a paso
- scaffolding
- integración editorial ligera

Usa `SP-DevControl` cuando el problema sea:

- approvals
- gates
- policy engine
- monitoreo de cambios
- compliance
- MCP de gobernanza
