import chalk from 'chalk'
import { DS_V1 } from './standard/ds-v1.js'
import type { NormDefinition, NormCategory, StepDefinition } from './types.js'
import { getPipelineForType, getAvailablePipelineTypes } from './catalog/pipelines.js'

interface ExplainOptions {
  norm?: string
  step?: string
  category?: string
  list?: boolean
}

const NORM_GUIDES: Record<string, string> = {
  'DS-001': `## README.md

**¿Por qué es importante?**
El README es la puerta de entrada al proyecto. Es lo primero que ven colaboradores, usuarios, y reclutadores.

**¿Cómo cumplirlo?**
Crea un README.md en la raíz del proyecto con:
- Nombre y descripción del proyecto
- Instrucciones de instalación
- Guía de uso rápida
- Ejemplos de código
- Badges de CI, cobertura, licencia
- Sección de contribución

**Ejemplo:**
\`\`\`markdown
# Mi Proyecto

Herramienta CLI para automatizar tareas.

## Instalación
npm install -g mi-proyecto

## Uso
mi-proyecto --help
\`\`\`

**Anti-patrones:**
- README vacío o generado automáticamente sin personalizar
- No actualizar el README cuando cambia la funcionalidad
- Instrucciones incorrectas o desactualizadas`,

  'DS-010': `## No Secrets in Code

**¿Por qué es importante?**
Hardcodear API keys, tokens, o contraseñas en el código fuente es la causa #1 de brechas de seguridad. Un commit a un repo público puede exponer credenciales a todo internet.

**¿Cómo cumplirlo?**
- Usa variables de entorno: \`process.env.API_KEY\`
- Usa archivos .env (agregados a .gitignore)
- Para desarrollo local, usa un archivo .env.local

**Bueno:**
\`\`\`typescript
const apiKey = process.env.API_KEY
if (!apiKey) throw new Error('API_KEY not set')
\`\`\`

**Malo:**
\`\`\`typescript
const apiKey = 'sk-1234567890abcdef1234567890abcdef'
\`\`\`

**Anti-patrones:**
- Commitear .env con valores reales
- Poner secrets en archivos de configuración del proyecto
- Compartir secrets por chat o email`,

  'DS-070': `## Conventional Commits

**¿Por qué es importante?**
Un formato estandarizado de commits permite:
- Generar changelogs automáticamente
- Determinar versión semántica (major/minor/patch)
- Filtrar commits por tipo
- Onboarding más rápido para nuevos contribuidores

**Formato:**
\`\`\`
<tipo>(<scope>): <descripción>

<cuerpo opcional>

<footer opcional>
\`\`\`

**Tipos válidos:**
| Tipo | Uso |
|---|---|
| feat | Nueva funcionalidad |
| fix | Corrección de bug |
| chore | Tareas de mantenimiento |
| docs | Cambios en documentación |
| refactor | Refactorización sin cambios funcionales |
| test | Añadir o modificar tests |
| style | Cambios de formato (espacios, commas, etc) |
| perf | Mejoras de rendimiento |
| ci | Cambios en CI/CD |
| build | Cambios en el sistema de build |

**Breaking changes:** Añadir \`!\` antes de \`:\`
\`\`\`
feat!: cambiar API de autenticación

BREAKING CHANGE: Se eliminó el endpoint /api/login
\`\`\`

**Ejemplos:**
- \`feat(auth): add OAuth2 login\`
- \`fix(api): handle null response from getUsers\`
- \`docs: fix typos in README\`

**Anti-patrones:**
- \`update code\` (demasiado genérico)
- \`fix bug\` (no dice qué bug)
- \`asdflkajsd\` (commits sin sentido)
- Varios cambios no relacionados en un solo commit`,

  'DS-050': `## Tests Required

**¿Por qué es importante?**
Los tests son la red de seguridad del proyecto. Permiten refactorizar con confianza, documentan el comportamiento esperado, y previenen regresiones.

**¿Cómo cumplirlo?**
Cada archivo fuente debe tener su test correspondiente:
- \`src/users.ts\` → \`tests/users.test.ts\`
- \`src/api/handler.ts\` → \`tests/api/handler.test.ts\`

**Buenas prácticas:**
- Tests unitarios para lógica de negocio
- Tests de integración para APIs
- Mínimo 70% de cobertura en código crítico
- Usa describe/it/expect para estructura clara

**Ejemplo:**
\`\`\`typescript
import { describe, it, expect } from 'vitest'
import { calculateTotal } from '../src/checkout.js'

describe('calculateTotal', () => {
  it('should apply discount for premium users', () => {
    expect(calculateTotal(100, 'premium')).toBe(80)
  })
})
\`\`\`

**Anti-patrones:**
- Tests que no assertan nada
- Tests que dependen de estado global
- Tests frágiles (pasan hoy, fallan mañana sin cambios)
- No escribir tests por "falta de tiempo"`,

  'DS-030': `## Strict TypeScript

**¿Por qué es importante?**
El modo estricto activa todas las validaciones de tipos de TypeScript, atrapando errores en tiempo de compilación en lugar de en producción.

**¿Cómo cumplirlo?**
En \`tsconfig.json\`:
\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
\`\`\`

**Beneficios:**
- \`strictNullChecks\`: Evita errores de null/undefined
- \`noImplicitAny\`: Obliga a tipar explícitamente
- \`strictFunctionTypes\`: Mayor seguridad en funciones

**Anti-patrones:**
- Usar \`as any\` para silenciar errores de tipo
- Desactivar strict porque "da mucho trabajo"
- Poner \`// @ts-nocheck\` en archivos`,

  'DS-071': `## .gitignore

**¿Por qué es importante?**
.gitignore evita que archivos innecesarios o sensibles se agreguen al repositorio.

**¿Qué debe ir en .gitignore?**
- \`node_modules/\` — dependencias
- \`dist/\` — código compilado
- \`.env\` — variables de entorno
- \`*.log\` — archivos de log
- \`.DS_Store\` — archivos de macOS
- \`coverage/\` — reportes de cobertura

**Generadores:** https://gitignore.io`,

  'DS-080': `## CHANGELOG

**¿Por qué es importante?**
Un changelog bien mantenido permite a usuarios y contribuidores saber qué cambió entre versiones sin leer el historial de git.

**Formato (Keep a Changelog):**
\`\`\`markdown
# Changelog

## [1.0.1] - 2025-01-15
### Fixed
- Error al procesar usuarios sin email

## [1.0.0] - 2025-01-01
### Added
- Sistema de autenticación
- API REST completa
\`\`\`

**Principios:**
- Un archivo, legible por humanos
- Fechas en formato ISO
- Secciones: Added, Changed, Deprecated, Removed, Fixed, Security
- Cada versión con su fecha`,

  'DS-091': `## tsconfig.json

**¿Por qué es importante?**
TypeScript configurado correctamente es la base de un proyecto robusto. tsconfig.json define cómo se compila, qué se incluye, y qué reglas se aplican.

**Configuración recomendada:**
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
\`\`\`

**Anti-patrones:**
- No tener tsconfig.json
- Usar módulos CommonJS en proyectos ESM
- Incluir node_modules o dist en la compilación`,
}

const CATEGORY_GUIDES: Record<string, string> = {
  documentation: `## Documentación

La documentación es el esqueleto del proyecto. Sin ella, el conocimiento se pierde cuando las personas cambian de equipo o proyecto.

**Documentos esenciales:**
- **README**: Puerta de entrada del proyecto
- **Architecture**: Decisiones técnicas y estructura
- **Requirements**: Qué debe hacer el sistema
- **ADRs**: Por qué se tomaron las decisiones

**Regla de oro:** Documenta el *por qué*, no el *qué*. El código ya dice qué hace.`,
  security: `## Seguridad

La seguridad no es un feature, es una propiedad del sistema.

**Principios:**
- **Defense in depth**: Múltiples capas de seguridad
- **Least privilege**: Mínimos permisos necesarios
- **Never trust user input**: Validar, sanitizar, escapar

**Áreas clave:**
- Secrets management
- SQL injection prevention
- XSS prevention
- Command injection prevention`,
  architecture: `## Arquitectura

La arquitectura define cómo se organiza el código y cómo interactúan sus componentes.

**Principios:**
- **Separation of concerns**: Cada capa tiene una responsabilidad
- **Dependency inversion**: Depende de abstracciones, no de implementaciones
- **Single responsibility**: Cada módulo hace una cosa

**Capas típicas:**
1. **Domain**: Lógica de negocio pura
2. **Application**: Orquestación y casos de uso
3. **Infrastructure**: Base de datos, APIs externas, sistema de archivos`,
  quality: `## Calidad

La calidad del código determina la velocidad de desarrollo a largo plazo.

**Métricas:**
- TypeScript strict mode
- Sin console.log en producción
- Archivos < 400 líneas
- Cobertura de tests > 70%

**Prácticas:**
- Code reviews obligatorios
- Linting automatizado
- Type checking en CI`,
  testing: `## Testing

Los tests son la especificación ejecutable del sistema.

**Pirámide de tests:**
1. **Unitarios** (70%): Lógica de negocio pura
2. **Integración** (20%): APIs, DB, servicios externos
3. **E2E** (10%): Flujos completos del usuario

**Reglas:**
- Cada archivo fuente debe tener su test
- No usar \`any\` en TypeScript
- Tests deben ser deterministas`,
  git: `## Git

Git es el sistema de control de versiones. Un historial limpio es señal de un proyecto bien gestionado.

**Convenciones:**
- Conventional Commits
- .gitignore configurado
- LICENSE file presente
- Ramas cortas con vida limitada`,
  release: `## Release

El proceso de release debe ser repetible, automatizado, y documentado.

**Componentes:**
- CHANGELOG.md con todas las versiones
- Versionado semántico (SemVer)
- Tags en git para cada versión
- Build automatizado`,
  'project-setup': `## Project Setup

La configuración inicial del proyecto determina su mantenibilidad a largo plazo.

**Requisitos:**
- package.json con dependencias y scripts
- tsconfig.json para TypeScript
- ESLint/Prettier para linting
- Editor config para consistencia`,
}

const STEP_GUIDES: Record<string, string> = {
  '1-validate-idea': `## Validar Idea

**¿Qué es este paso?**
Evaluación multi-agente de la idea del proyecto. Tres agentes (opencode, claude, codex) investigan en paralelo el mercado, la competencia, y el stack tecnológico.

**¿Por qué es importante?**
Antes de escribir una línea de código, debes validar que:
1. El problema existe y vale la pena resolverlo
2. Hay mercado para la solución
3. El equipo tiene las capacidades técnicas
4. La relación costo/beneficio es positiva

**¿Qué producirás?**
- \`decision.md\`: Viabilidad (GO/ITERATE/KILL)
- \`research.md\`: Investigación de mercado
- \`analysis.md\`: Análisis técnico-económico`,
  '2-design': `## Diseñar

**¿Qué es este paso?**
Diseño de la solución completo: requisitos funcionales y no funcionales, arquitectura del sistema, y registro de decisiones técnicas (ADRs).

**¿Por qué es importante?**
El diseño temprano previene costosos cambios arquitectónicos durante el desarrollo. Un ADR documenta no solo qué se decidió, sino por qué.

**¿Qué producirás?**
- \`docs/requirements.md\`: Requisitos funcionales y no funcionales
- \`docs/architecture.md\`: Arquitectura del sistema
- \`docs/adr-*.md\`: Decisiones técnicas documentadas`,
  '3-init': `## Inicializar

**¿Qué es este paso?**
Creación de la estructura del proyecto: directorios, archivos de configuración, dependencias, y control de versiones.

**¿Por qué es importante?**
Un proyecto bien estructurado desde el inicio es más fácil de mantener y escalar.

**¿Qué producirás?**
- \`package.json\`: Dependencias y scripts
- \`tsconfig.json\`: Configuración de TypeScript
- \`src/\`, \`tests/\`, \`docs/\`: Estructura de directorios
- Repositorio git inicializado`,
  '4-develop': `## Desarrollar

**¿Qué es este paso?**
Desarrollo iterativo con sesiones de gobernanza DevControl. El ciclo típico es: tarea → desarrollo → validación → commit.

**¿Por qué es importante?**
La gobernanza continua asegura que el código mantenga la calidad y cumpla con el estándar en todo momento.

**¿Qué producirás?**
- Código fuente en \`src/\`
- Tests en \`tests/\`
- Sesiones de DevControl validadas`,
  '5-verify': `## Verificar

**¿Qué es este paso?**
Gates de calidad automatizados y revisión de código. Typecheck, lint, tests, y validación de normas DS-v1.

**¿Por qué es importante?**
La verificación automatizada previene que errores lleguen a producción y mantiene la calidad del código constante.

**¿Qué producirás?**
- Reporte de typecheck
- Reporte de lint
- Resultados de tests
- Reporte de code review`,
  '5.5-review': `## Revisar

**¿Qué es este paso?**
Code review final antes del release. Una revisión humana profunda del código y las decisiones técnicas.

**¿Por qué es importante?**
El ojo humano encuentra problemas que las herramientas automáticas no detectan: lógica incorrecta, malas prácticas, code smells.

**¿Qué producirás?**
- \`review-report.md\`: Reporte de revisión
- Aprobación (o cambios solicitados)`,
  '6-release': `## Release

**¿Qué es este paso?**
Empaquetado y publicación de una nueva versión del proyecto.

**¿Por qué es importante?**
Un proceso de release estandarizado asegura que cada versión sea reproducible, documentada, y etiquetada correctamente.

**¿Qué producirás?**
- Nueva versión en package.json
- CHANGELOG.md actualizado
- Build compilado
- Tag en git`,
  '7-maintain': `## Mantener

**¿Qué es este paso?**
Ciclo perpetuo de mantenimiento: corrección de bugs, nuevas features, parches de seguridad, y actualizaciones de dependencias.

**¿Por qué es importante?**
El software vivo necesita mantenimiento constante. Un proyecto sin mantenimiento se vuelve obsoleto e inseguro.

**¿Qué producirás?**
- Versiones de mantenimiento (patch)
- Versiones de features (minor)
- Correcciones de seguridad`,
}

export function runExplain(options: ExplainOptions): void {
  if (options.list) {
    if (options.category) {
      const norms = DS_V1.norms.filter(n => n.category === options.category)
      console.log(chalk.bold(`\n📏 Normas en categoría "${options.category}":\n`))
      for (const n of norms) {
        const sev = n.severity === 'error' ? chalk.red('error') : chalk.yellow('warning')
        console.log(`  ${chalk.bold(n.id)} — ${n.name} (${sev})`)
        console.log(chalk.dim(`    ${n.description}`))
      }
    } else {
      const categories = [...new Set(DS_V1.norms.map(n => n.category))] as NormCategory[]
      console.log(chalk.bold('\n📏 DS-v1 Standard — 24 normas\n'))
      for (const cat of categories) {
        console.log(chalk.cyan(`[${cat.toUpperCase()}]`))
        for (const n of DS_V1.norms.filter(n2 => n2.category === cat)) {
          const sev = n.severity === 'error' ? chalk.red('●') : chalk.yellow('◌')
          console.log(`  ${sev} ${chalk.bold(n.id)}: ${n.name}`)
        }
        console.log('')
      }
    }
    return
  }

  if (options.norm) {
    const norm = DS_V1.norms.find(n => n.id === options.norm)
    if (!norm) {
      console.log(chalk.red(`Norma "${options.norm}" no encontrada.`))
      console.log(chalk.dim(`Usa "devsteps explain --list" para ver todas las normas.`))
      return
    }
    console.log('')
    console.log(chalk.bold(`📏 ${norm.id}: ${norm.name}`))
    console.log(chalk.dim(`Categoría: ${norm.category} | Severidad: ${norm.severity === 'error' ? chalk.red('error') : chalk.yellow('warning')}`))
    console.log('')

    const guide = NORM_GUIDES[norm.id]
    if (guide) {
      console.log(guide)
    } else {
      console.log(norm.description)
      console.log('')
      console.log(chalk.bold('🤖 AI Prompt:'))
      console.log(norm.aiPrompt)
    }
    console.log('')
    return
  }

  if (options.step) {
    const guide = STEP_GUIDES[options.step]
    if (!guide) {
      console.log(chalk.yellow(`No hay guía detallada para el paso "${options.step}".`))
      return
    }
    console.log('')
    console.log(guide)
    console.log('')
    return
  }

  if (options.category) {
    const guide = CATEGORY_GUIDES[options.category]
    if (guide) {
      console.log('')
      console.log(guide)
      console.log('')
    } else {
      console.log(chalk.yellow(`No hay guía para la categoría "${options.category}".`))
    }
    return
  }

  console.log(chalk.bold('\n📖 devSteps Explain — Sistema de Mentoría'))
  console.log('')
  console.log(chalk.cyan('Uso:'))
  console.log('  devsteps explain --norm <id>      Explicación detallada de una norma')
  console.log('  devsteps explain --step <id>      Guía para un paso del pipeline')
  console.log('  devsteps explain --category <cat>  Guía para una categoría de normas')
  console.log('  devsteps explain --list            Listar todas las normas')
  console.log('  devsteps explain --list --category <cat>  Filtrar normas por categoría')
  console.log('')
  console.log(chalk.dim('Ejemplos:'))
  console.log('  devsteps explain --norm DS-010')
  console.log('  devsteps explain --step 4-develop')
  console.log('  devsteps explain --category security')
  console.log('  devsteps explain --list --category git')
}
