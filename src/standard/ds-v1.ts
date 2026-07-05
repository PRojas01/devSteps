/** Module purpose: supports devSteps ds v1 functionality. */
import type { StandardDefinition, NormDefinition, NormCategory, Severity } from '../types.js'

function norm(
  id: string, name: string, description: string, category: NormCategory,
  severity: Severity, scope: string[], validation: NormDefinition['validation'], aiPrompt: string,
): NormDefinition {
  return { id, name, description, category, severity, scope, validation, aiPrompt }
}

export const DS_V1: StandardDefinition = {
  id: 'ds-v1',
  name: 'devSteps Standard v1',
  version: '1.0.0',
  norms: [
    // ── Documentation (DS-001 ~ DS-009) ─────────────────────────
    norm('DS-001', 'README required', 'Project must have a README.md with description, install, and usage',
      'documentation', 'error', ['README.md'],
      { type: 'exists' },
      'Create a README.md with project name, description, installation, and usage instructions'),

    norm('DS-002', 'Module purpose comment', 'Every source module must have a comment describing its purpose',
      'documentation', 'warning', ['src/**/*.ts'],
      { type: 'content', pattern: '/\\*\\*\\s*.+' },
      'Add a JSDoc comment at the top of each module explaining its purpose'),

    norm('DS-003', 'Requirements doc', 'Project must have a requirements document',
      'documentation', 'error', ['docs/requirements.md'],
      { type: 'exists' },
      'Create docs/requirements.md with functional and non-functional requirements'),

    norm('DS-004', 'Architecture doc', 'Project must have an architecture document',
      'documentation', 'error', ['docs/architecture.md'],
      { type: 'exists' },
      'Create docs/architecture.md describing system architecture, components, and data flow'),

    norm('DS-005', 'ADR required for decisions', 'Architecture decisions must be documented as ADRs',
      'documentation', 'warning', ['docs/adr-*.md'],
      { type: 'content', pattern: '# ADR-\\d+' },
      'Document significant architecture decisions as ADR files with status, context, and decision'),

    // ── Security (DS-010 ~ DS-019) ──────────────────────────────
    norm('DS-010', 'No secrets in code', 'API keys, tokens, and passwords must not be hardcoded',
      'security', 'error', ['src/**/*.ts', 'src/**/*.js', 'config/**/*'],
      { type: 'regex', patterns: ['(?:api[_-]?key|secret|password|token|credential).{0,5}=[\'\"][A-Za-z0-9_]{16,}[\'\"]'] },
      'Check for hardcoded credentials. Use environment variables instead.'),

    norm('DS-011', 'SQL injection prevention', 'Use parameterized queries, never string interpolation in SQL',
      'security', 'error', ['src/**/*.ts', 'src/**/*.js'],
      { type: 'regex', patterns: ['\\$\\{.*\\}.*(?:execute|query|run|all|get)\\(', 'SELECT.*\\+\\s'] },
      'Use parameterized queries with ? placeholders instead of string interpolation'),

    norm('DS-012', 'No innerHTML without sanitization', 'Avoid innerHTML or dangerouslySetInnerHTML without DOMPurify',
      'security', 'error', ['src/**/*.tsx', 'src/**/*.ts'],
      { type: 'regex', patterns: ['innerHTML\\s*=', 'dangerouslySetInnerHTML'] },
      'Use safe DOM APIs or sanitize with DOMPurify before using innerHTML'),

    norm('DS-013', 'Command injection prevention', 'Use execFile or execa with arguments array, not exec with string',
      'security', 'error', ['src/**/*.ts', 'src/**/*.js'],
      { type: 'regex', patterns: ['exec\\(\\s*`[^`]*\\$\\{'] },
      'Use execFile or execa with arguments array instead of string interpolation in exec()'),

    // ── Architecture (DS-020 ~ DS-029) ──────────────────────────
    norm('DS-020', 'Layer separation', 'Code must follow layer separation (domain/application/infrastructure)',
      'architecture', 'warning', ['src/**/*.ts'],
      { type: 'structure' },
      'Organize code into domain, application, and infrastructure layers'),

    norm('DS-021', 'Consistent naming', 'Files must follow consistent naming convention',
      'architecture', 'warning', ['src/**/*.ts'],
      { type: 'regex', patterns: ['^[a-z][a-zA-Z0-9]+\\.(ts|tsx)$'] },
      'Use camelCase or kebab-case consistently for file names'),

    norm('DS-022', 'Single responsibility', 'Each module should have a single responsibility',
      'architecture', 'warning', ['src/**/*.ts'],
      { type: 'custom' },
      'Each module should do one thing well. Split large modules into smaller ones.'),

    // ── Quality (DS-030 ~ DS-039) ───────────────────────────────
    norm('DS-030', 'Strict TypeScript', 'TypeScript must use strict mode',
      'quality', 'error', ['tsconfig.json'],
      { type: 'content', pattern: '"strict":\\s*true' },
      'Enable strict mode in tsconfig.json'),

    norm('DS-031', 'No console.log in production', 'Production code should not contain console.log',
      'quality', 'warning', ['src/**/*.ts', 'src/**/*.tsx'],
      { type: 'regex', patterns: ['console\\.(log|debug)\\('] },
      'Remove console.log/debug statements. Use a proper logger if needed.'),

    norm('DS-032', 'File length limit', 'Source files should not exceed 400 lines',
      'quality', 'warning', ['src/**/*.ts', 'src/**/*.tsx'],
      { type: 'custom' },
      'Split files longer than 400 lines into smaller modules'),

    // ── Testing (DS-050 ~ DS-059) ───────────────────────────────
    norm('DS-050', 'Tests required for source', 'New source files must have corresponding test files',
      'testing', 'error', ['src/**/*.ts', 'src/**/*.tsx'],
      { type: 'custom' },
      'Create test files for each source module'),

    norm('DS-051', 'No any types', 'Avoid using the any type in TypeScript',
      'testing', 'warning', ['src/**/*.ts', 'src/**/*.tsx'],
      { type: 'regex', patterns: [':\\s*any\\b', 'as\\s+any\\b'] },
      'Replace any types with proper types or use unknown if type is truly unknown'),

    // ── Git (DS-070 ~ DS-079) ───────────────────────────────────
    norm('DS-070', 'Conventional Commits', 'Commit messages must follow Conventional Commits format',
      'git', 'error', [],
      { type: 'regex', patterns: ['^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\\(.+\\))?!?:\\s.+'] },
      'Use format: type(scope): description. Valid types: feat, fix, chore, docs, refactor, test, style, perf, ci, build'),

    norm('DS-071', '.gitignore present', 'Project must have a .gitignore file',
      'git', 'error', ['.gitignore'],
      { type: 'exists' },
      'Create .gitignore with appropriate patterns for the project stack'),

    norm('DS-072', 'License file', 'Project must have a LICENSE file',
      'git', 'warning', ['LICENSE'],
      { type: 'exists' },
      'Add a LICENSE file with the project license'),

    // ── Release (DS-080 ~ DS-089) ───────────────────────────────
    norm('DS-080', 'CHANGELOG required', 'Project must have a CHANGELOG.md',
      'release', 'warning', ['CHANGELOG.md'],
      { type: 'exists' },
      'Create CHANGELOG.md following keepachangelog.com format'),

    norm('DS-081', 'SemVer versioning', 'Project version must follow SemVer',
      'release', 'error', ['package.json'],
      { type: 'content', pattern: '"version":\\s*"\\d+\\.\\d+\\.\\d+"' },
      'Use semantic versioning (MAJOR.MINOR.PATCH) in package.json'),

    // ── Project Setup (DS-090 ~ DS-099) ─────────────────────────
    norm('DS-090', 'package.json present', 'Project must have package.json',
      'project-setup', 'error', ['package.json'],
      { type: 'exists' },
      'Create package.json with project metadata and dependencies'),

    norm('DS-091', 'tsconfig.json present', 'TypeScript project must have tsconfig.json',
      'project-setup', 'error', ['tsconfig.json'],
      { type: 'exists' },
      'Create tsconfig.json with appropriate compiler options'),
  ],
}

export function getNormById(id: string): NormDefinition | undefined {
  return DS_V1.norms.find(n => n.id === id)
}

export function getNormsByCategory(category: string): NormDefinition[] {
  return DS_V1.norms.filter(n => n.category === category)
}

export function getNormsByScope(filePath: string): NormDefinition[] {
  return DS_V1.norms.filter(n => n.scope.some(pattern => {
    const regex = globToRegex(pattern)
    return regex.test(filePath)
  }))
}

function globToRegex(pattern: string): RegExp {
  let regex = '^'
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      regex += '(.+/)?'
      i += 2
      if (pattern[i] === '/') i++
    } else if (ch === '*') {
      regex += '[^/]*'
      i++
    } else if (ch === '.') {
      regex += '\\.'
      i++
    } else if ('?+()[]{}^$|'.includes(ch)) {
      regex += '\\' + ch
      i++
    } else {
      regex += ch
      i++
    }
  }
  regex += '$'
  return new RegExp(regex)
}
