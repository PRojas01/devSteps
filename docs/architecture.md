# Architecture — SP-devSteps

## Overview

`SP-devSteps` es un CLI en TypeScript que modela el ciclo de vida de un proyecto como un pipeline. La arquitectura está organizada para separar definición de pipeline, ejecución, validación, documentación e integraciones con agentes.

## Main Components

### CLI

- Archivo principal: `src/cli.ts`
- Registra comandos de usuario y delega a módulos especializados.

### Engine

- Ubicación: `src/engine/`
- Responsabilidad: contexto, checkpoints, gates, ejecución y avance entre pasos.

### Standards

- Ubicación: `src/standard/`
- Responsabilidad: definición DS-v1 y validación de artefactos del proyecto.

### Launchers

- Ubicación: `src/launchers/`
- Responsabilidad: encapsular ejecución o detección de sistemas como Codex, Claude, OpenCode, humano y auto.

### Onboarding and Docs

- Archivos: `src/guide.ts`, `src/docs.ts`, `src/explain.ts`
- Responsabilidad: explicar el pipeline, generar documentación y hacer el sistema usable para principiantes.

### Integrations

- Archivos: `src/plugins.ts`, `src/skill-injector.ts`, `opencode.json`
- Responsabilidad: preparar skills, configuraciones para editores e integraciones tipo plugin/MCP.

### Sibling Integration with DevControl

- `SP-devSteps` decide el flujo y los artefactos del proyecto.
- `SP-DevControl` aplica gates, políticas, monitoreo y aprobación humana.
- Ambos comparten archivos de contexto para editores y entornos MCP.

## Interaction Channels

- Direct CLI: el usuario ejecuta comandos, ve resultados en terminal y decide cuándo avanzar.
- Agentic editor: el usuario conversa con un agente en Codex, Claude Code, Cursor, Windsurf u OpenCode; el agente lee los archivos inyectados y actúa como operador guiado del pipeline.

Ambos canales comparten `devsteps.yaml`, DS-v1, documentación del proyecto y, cuando aplica, reglas de DevControl.

## Distribution Modes

### CLI

Interacción directa por terminal para usuarios y automatización.

### Skill

Generación de archivos de instrucciones para asistentes y editores agénticos.

### Extension / MCP

Capa de integración para conectar el proyecto con VS Code, GitHub Actions y entornos compatibles con MCP.

### Relationship Model

`SP-devSteps` = orquestación.

`SP-DevControl` = gobernanza.

El diseño recomendado es usar ambos en el mismo repositorio de usuario final.

## Execution Flow

1. El usuario invoca `devsteps`.
2. El CLI carga `devsteps.yaml`.
3. El engine determina el paso actual del pipeline.
4. Se ejecutan sistemas automáticos, humanos o agentes según el paso.
5. Se guardan contexto, resultados y checkpoints.
6. El validador DS-v1 comprueba cumplimiento de calidad y release.

## Quality Strategy

- TypeScript estricto para seguridad de tipos.
- Vitest para regresiones de comportamiento.
- DS-v1 para documentación, setup, seguridad, commits y release.
- Documentación generada para reducir fricción de onboarding.

## ADR Policy

Las decisiones relevantes se registran como ADRs en `docs/adr-*.md`.
