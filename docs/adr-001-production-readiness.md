# ADR-001: Position devSteps for production release and beginner onboarding

**Status:** Accepted
**Date:** 2026-07-05

## Context

El proyecto ya tenía base funcional en TypeScript, tests y una superficie CLI amplia, pero no estaba listo para compartirse con confianza porque faltaban artefactos de release, documentación para principiantes y una narrativa clara sobre sus tres modos principales de uso.

## Decision

Se formaliza `devSteps` como un producto con tres modos:

1. CLI instalable
2. Skill para agentes
3. Integración por extensión o MCP

Además, se exige documentación de onboarding, arquitectura, requisitos, publicación, licencia y changelog como parte del estado mínimo para release.

## Consequences

- El proyecto queda más fácil de entender y adoptar.
- El repositorio puede compartirse en GitHub sin depender de explicación adicional.
- La generación automática de documentación debe mantenerse alineada con esta decisión.
