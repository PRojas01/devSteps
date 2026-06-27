import { readFileSync, existsSync } from 'fs'
import { statSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
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
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const dir = resolve(root, pattern.split('*')[0] ?? '.')
      if (existsSync(dir)) {
        files.push(...walkDir(dir))
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
