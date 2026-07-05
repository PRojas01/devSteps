# Security Policy

`SP-devSteps` no es el motor de gobernanza del stack; esa responsabilidad principal vive en `SP-DevControl`. Aun así, este proyecto maneja configuración, ejecución de comandos y generación de artefactos, por lo que la seguridad sigue siendo una exigencia de diseño.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active |
| < 1.0   | ❌ Not supported |

## Reportar una vulnerabilidad

No abras vulnerabilidades en issues públicos.

Canales recomendados:

1. `security@solucionespro.com`
2. Reporte privado en GitHub Security Advisories del repositorio correspondiente

## Áreas sensibles

- `src/launchers/` — integración con herramientas externas
- `src/standard/` — validación y reglas
- `src/plugins.ts` — generación de configuraciones editoriales y CI
- `src/scaffold.ts` — generación de archivos base

## Límites de seguridad del producto

- `SP-devSteps` guía y genera contexto.
- `SP-DevControl` debe usarse cuando se requiere enforcement de políticas, gates o monitoreo.

## Recomendación operativa

Para proyectos con agentes activos:

1. Usa `devsteps` para pipeline y documentación.
2. Usa `sp-devcontrol` para gobernanza y aprobación humana.
