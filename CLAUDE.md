# TestRun — devSteps Pipeline

This project uses devSteps to orchestrate its development lifecycle.
Follow this pipeline strictly. Complete each step before moving to the next.

## Project
- **Name:** TestRun
- **Type:** web-app
- **Stack:** typescript node
- **Standard:** ds-v1

## Pipeline Steps

### 1. 1-validate-idea: Validar Idea
Evaluación multi-agente de la idea: investigación, análisis, iteración, matriz de viabilidad

**Execute with:** opencode, claude, codex
**Approved by:** human
**Entry criteria:** Idea definida
**Exit criteria:** decision.md:exists, idea:validated
**Output:** decision.md, research.md, analysis.md

### 2. 2-design: Diseñar
Diseño de la solución: requisitos, arquitectura, decisiones. DevControl valida contra el estándar.

**Execute with:** opencode
**Approved by:** human
**Entry criteria:** decision.md:exists, decision:equals=GO
**Exit criteria:** docs/requirements.md:exists, docs/architecture.md:exists, docs:validated
**Output:** docs/requirements.md, docs/architecture.md, docs/adr-*.md

### 3. 3-init: Inicializar
Scaffolding del proyecto: estructura, configuración, dependencias, git

**Execute with:** opencode
**Approved by:** human
**Entry criteria:** docs/architecture.md:exists
**Exit criteria:** package.json:exists, src/:exists, git:initialized
**Output:** package.json, tsconfig.json, src/, tests/

### 4. 4-develop: Desarrollar
Desarrollo con gobernanza DevControl: watch mode, sesiones, approvals

**Execute with:** opencode
**Approved by:** human
**Entry criteria:** src/:exists, package.json:exists
**Exit criteria:** DS-040:validated, DS-050:validated
**Output:** src/**/*, tests/**/*

### 5. 5-verify: Verificar
Quality gates: typecheck, lint, tests, code review, compliance

**Execute with:** auto, opencode
**Approved by:** human
**Entry criteria:** tests/:exists
**Exit criteria:** typecheck:pass, lint:pass, test:pass, DS-070:validated
**Output:** test-report.md

### 6. 5.5-review: Revisar
Code review y validación final antes de release

**Execute with:** opencode
**Approved by:** human
**Entry criteria:** DS-050:validated
**Exit criteria:** review:approved
**Output:** review-report.md

### 7. 6-release: Release
Versionado, changelog, build y publicación

**Execute with:** auto, human
**Approved by:** human
**Entry criteria:** test:pass, review:approved
**Exit criteria:** CHANGELOG.md:exists, build:success, version:bumped
**Output:** CHANGELOG.md, dist/, git-tag

### 8. 7-maintain: Mantener
Ciclo de mantenimiento perpetuo: bugs, features, parches

**Execute with:** opencode
**Approved by:** human
**Entry criteria:** release:completed




## Standards (DS-v1)

- **DS-001** (🔴): Project must have a README.md with description, install, and usage
- **DS-003** (🔴): Project must have a requirements document
- **DS-004** (🔴): Project must have an architecture document
- **DS-010** (🔴): API keys, tokens, and passwords must not be hardcoded
- **DS-011** (🔴): Use parameterized queries, never string interpolation in SQL
- **DS-012** (🔴): Avoid innerHTML or dangerouslySetInnerHTML without DOMPurify
- **DS-013** (🔴): Use execFile or execa with arguments array, not exec with string
- **DS-030** (🔴): TypeScript must use strict mode
- **DS-050** (🔴): New source files must have corresponding test files
- **DS-070** (🔴): Commit messages must follow Conventional Commits format
- **DS-071** (🔴): Project must have a .gitignore file
- **DS-081** (🔴): Project version must follow SemVer
- **DS-090** (🔴): Project must have package.json
- **DS-091** (🔴): TypeScript project must have tsconfig.json

## devSteps Commands

- `devsteps status` — Check current step
- `devsteps run` — Run pipeline
- `devsteps step:complete <id>` — Mark step done
- `devsteps validate` — Validate against standard
- `devsteps launch <step-id>` — Launch tool for step
