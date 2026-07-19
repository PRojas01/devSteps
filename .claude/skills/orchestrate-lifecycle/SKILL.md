---
name: orchestrate-lifecycle
description: Guiar proyectos con devSteps usando el CLI, el pipeline, scaffolding, validaciones DS-v1 y el MCP de DevControl cuando este disponible.
---

# Orquestar ciclo de vida con devSteps

Usar esta skill cuando el usuario pida iniciar, guiar, validar, revisar o avanzar un proyecto con devSteps.

devSteps es el orquestador del pipeline. DevControl es la capa MCP de gobernanza declarada en `.mcp.json` como servidor `devcontrol`.

## Flujo base

1. Leer `devsteps.yaml`, `AGENTS.md` o `CLAUDE.md` si existen.
2. Ejecutar `devsteps status` para ubicar el paso actual antes de modificar archivos.
3. Si el proyecto no tiene `devsteps.yaml`, proponer o ejecutar scaffolding con `devsteps scaffold`.
4. Antes de implementar, identificar el paso del pipeline, criterios de entrada, criterios de salida y artefactos esperados.
5. Usar el CLI para operaciones de ciclo de vida:
   - `devsteps guide` para guiar al usuario paso a paso.
   - `devsteps run` para ejecutar el pipeline.
   - `devsteps validate` para validar DS-v1.
   - `devsteps step:complete <id>` para marcar pasos terminados cuando el usuario apruebe.
   - `devsteps inject` para regenerar instrucciones de agentes cuando cambie el pipeline.
6. Usar el MCP `devcontrol` si esta conectado para gobierno, politicas, sesiones, aprobaciones o chequeos complementarios.
7. Si el MCP no esta disponible, continuar con el CLI de devSteps y documentar la limitacion.
8. No saltar aprobaciones humanas declaradas en el pipeline.
9. No fabricar artefactos de salida: crear solo los archivos exigidos por el paso activo o por la solicitud explicita.
10. Cerrar el trabajo con `devsteps validate` cuando el cambio toque documentacion, configuracion, fuente o tests.

## Scaffolding

Para crear una base nueva:

```bash
devsteps scaffold --name "Mi Proyecto" --type web-app --stack typescript,node --force
devsteps inject
devsteps validate
```

Despues de scaffolding, revisar los archivos generados antes de modificar el codigo:

- `devsteps.yaml`
- `README.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `AGENTS.md`
- `CLAUDE.md`

## MCP

El MCP declarado por devSteps es:

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

Antes de depender de herramientas MCP, verificar que el servidor local de DevControl este iniciado y accesible. Si no lo esta, pedir al usuario que lo inicie o trabajar solo con el CLI.

## Cierre esperado

Al finalizar una tarea:

1. Resumir el paso de pipeline trabajado.
2. Listar archivos modificados.
3. Reportar validaciones ejecutadas.
4. Indicar si queda pendiente aprobacion humana del pipeline.
