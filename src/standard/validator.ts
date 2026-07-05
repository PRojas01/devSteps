/** Validates files and projects against DS-v1 rules using file existence and content checks. */
import { readFileSync, existsSync } from 'fs'
import { statSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'
import type { NormDefinition, NormCheck, GateResult, NormValidation } from '../types.js'

export function validateFileAgainstNorm(filePath: string, norm: NormDefinition): NormCheck {
  try {
    switch (norm.validation.type) {
      case 'exists':
        return validateExists(filePath, norm)
      case 'regex':
        return validateRegex(filePath, norm)
      case 'content':
        return validateContent(filePath, norm)
      case 'custom':
        return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'Custom validation skipped' }
      default:
        return { normId: norm.id, result: 'partial', severity: norm.severity, message: `Unknown validation type: ${norm.validation.type}` }
    }
  } catch (err) {
    return {
      normId: norm.id,
      result: 'fail',
      severity: norm.severity,
      message: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
      filepath: filePath,
    }
  }
}

export function validateProjectAgainstStandard(
  projectRoot: string, norms: NormDefinition[],
): NormCheck[] {
  const results: NormCheck[] = []
  for (const norm of norms) {
    if (norm.scope.length === 0) {
      results.push({
        normId: norm.id,
        result: 'partial',
        severity: norm.severity,
        message: 'Global rule requires context-aware validation and is skipped by file scanner',
      })
      continue
    }

    const matchedFiles = findFilesForScope(projectRoot, norm.scope)
    if (matchedFiles.length === 0) {
      results.push({
        normId: norm.id,
        result: 'fail',
        severity: norm.severity,
        message: `No files match scope: ${norm.scope.join(', ')}`,
      })
      continue
    }
    for (const filePath of matchedFiles) {
      results.push(validateFileAgainstNorm(filePath, norm))
    }
  }
  return results
}

function validateExists(filePath: string, norm: NormDefinition): NormCheck {
  const exists = existsSync(filePath)
  return {
    normId: norm.id,
    result: exists ? 'pass' : 'fail',
    severity: norm.severity,
    message: exists ? `${filePath} exists` : `${filePath} not found`,
    filepath: filePath,
  }
}

function validateRegex(filePath: string, norm: NormDefinition): NormCheck {
  if (!existsSync(filePath)) {
    return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'File not found, skipping', filepath: filePath }
  }
  if (shouldSkipConsoleRule(filePath, norm)) {
    return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'Skipped interactive CLI module', filepath: filePath }
  }
  if (shouldSkipSecurityDefinitionFile(filePath, norm)) {
    return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'Skipped rule definition file', filepath: filePath }
  }
  const content = readFileSync(filePath, 'utf-8')
  const patterns = norm.validation.patterns ?? (norm.validation.pattern ? [norm.validation.pattern] : [])

  if (patterns.length === 0) {
    return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'No patterns defined', filepath: filePath }
  }

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'g')
      const matches = content.match(regex)
      if (matches && matches.length > 0) {
        return {
          normId: norm.id,
          result: 'fail',
          severity: norm.severity,
          message: `Found ${matches.length} violation(s) matching: ${pattern}`,
          filepath: filePath,
        }
      }
    } catch {
      return { normId: norm.id, result: 'partial', severity: norm.severity, message: `Invalid regex: ${pattern}`, filepath: filePath }
    }
  }

  return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'No violations found', filepath: filePath }
}

function validateContent(filePath: string, norm: NormDefinition): NormCheck {
  if (!existsSync(filePath)) {
    return { normId: norm.id, result: 'fail', severity: norm.severity, message: `${filePath} not found`, filepath: filePath }
  }
  const content = readFileSync(filePath, 'utf-8')
  const pattern = norm.validation.pattern
  if (!pattern) {
    return { normId: norm.id, result: 'pass', severity: norm.severity, message: 'No pattern defined', filepath: filePath }
  }

  try {
    const regex = new RegExp(pattern)
    const found = regex.test(content)
    return {
      normId: norm.id,
      result: found ? 'pass' : 'fail',
      severity: norm.severity,
      message: found ? `Pattern found in ${filePath}` : `Pattern not found in ${filePath}`,
      filepath: filePath,
    }
  } catch {
    return { normId: norm.id, result: 'partial', severity: norm.severity, message: `Invalid pattern: ${pattern}`, filepath: filePath }
  }
}

function findFilesForScope(root: string, patterns: string[]): string[] {
  const files: string[] = []
  const allFiles = walkDir(root)

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const matcher = globToRegex(pattern)
      for (const absolutePath of allFiles) {
        const relPath = relative(root, absolutePath).replaceAll('\\', '/')
        if (matcher.test(relPath)) files.push(absolutePath)
      }
    } else {
      const fullPath = resolve(root, pattern)
      if (existsSync(fullPath)) {
        files.push(fullPath)
      }
    }
  }
  return [...new Set(files)]
}

function walkDir(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...walkDir(fullPath))
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  } catch {
    // skip unreadable directories
  }
  return files
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
      continue
    }
    if (ch === '*') {
      regex += '[^/]*'
      i++
      continue
    }
    if (ch === '.') {
      regex += '\\.'
      i++
      continue
    }
    if ('?+()[]{}^$|'.includes(ch)) {
      regex += '\\' + ch
      i++
      continue
    }
    regex += ch
    i++
  }

  regex += '$'
  return new RegExp(regex)
}

function shouldSkipSecurityDefinitionFile(filePath: string, norm: NormDefinition): boolean {
  const normalized = filePath.replaceAll('\\', '/')
  return normalized.endsWith('/src/standard/ds-v1.ts') && norm.id.startsWith('DS-01')
}

function shouldSkipConsoleRule(filePath: string, norm: NormDefinition): boolean {
  if (norm.id !== 'DS-031') return false

  const normalized = filePath.replaceAll('\\', '/')
  const interactiveModules = [
    '/src/cli.ts',
    '/src/autopilot.ts',
    '/src/dashboard.ts',
    '/src/docs.ts',
    '/src/explain.ts',
    '/src/git-hooks.ts',
    '/src/guide.ts',
    '/src/history.ts',
    '/src/plugins.ts',
    '/src/profiles.ts',
    '/src/scaffold.ts',
    '/src/standard/custom.ts',
    '/src/terminal.ts',
    '/src/watch.ts',
    '/src/launchers/index.ts',
    '/src/launchers/human.ts',
  ]

  return interactiveModules.some((suffix) => normalized.endsWith(suffix))
}
