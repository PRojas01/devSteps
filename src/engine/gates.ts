import type { GateCheck, GateResult } from '../types.js'

export function evaluateEntryCriteria(criteria: string[], context: Record<string, unknown>): GateCheck[] {
  return criteria.map(c => evaluateCriterion(c, 'entry', context))
}

export function evaluateExitCriteria(criteria: string[], context: Record<string, unknown>): GateCheck[] {
  return criteria.map(c => evaluateCriterion(c, 'exit', context))
}

function evaluateCriterion(raw: string, type: 'entry' | 'exit', context: Record<string, unknown>): GateCheck {
  const colonIdx = raw.indexOf(':')
  if (colonIdx === -1) return existsCheck(raw.trim(), context)

  const artifact = raw.slice(0, colonIdx).trim()
  const rest = raw.slice(colonIdx + 1).trim()
  const eqIdx = rest.indexOf('=')
  const condition = eqIdx === -1 ? rest : rest.slice(0, eqIdx).trim()
  const expected = eqIdx === -1 ? undefined : rest.slice(eqIdx + 1).trim()

  switch (condition) {
    case 'exists':
      return existsCheck(artifact, context)
    case 'equals':
      return equalsCheck(artifact, expected, context)
    case 'contains':
      return containsCheck(artifact, expected, context)
    case 'validated':
      return validatedCheck(artifact, context)
    default:
      return { criteria: raw, result: 'partial', message: `Unknown condition: ${condition}` }
  }
}

function existsCheck(artifact: string, context: Record<string, unknown>): GateCheck {
  const artifacts = context['artifacts'] as string[] | undefined
  const exists = artifacts?.includes(artifact) ?? false
  return {
    criteria: `${artifact} exists`,
    result: exists ? 'pass' : 'fail',
    message: exists ? `${artifact} found` : `${artifact} not found`,
  }
}

function equalsCheck(artifact: string, expected: string | undefined, context: Record<string, unknown>): GateCheck {
  const value = context[artifact] as string | undefined
  const match = value === expected
  return {
    criteria: `${artifact} = ${expected}`,
    result: match ? 'pass' : 'fail',
    message: match ? `${artifact} matches` : `${artifact} = ${value}, expected ${expected}`,
  }
}

function containsCheck(artifact: string, expected: string | undefined, context: Record<string, unknown>): GateCheck {
  const value = context[artifact] as string | undefined
  const found = value?.includes(expected ?? '') ?? false
  return {
    criteria: `${artifact} contains ${expected}`,
    result: found ? 'pass' : 'fail',
    message: found ? `${artifact} contains ${expected}` : `${artifact} does not contain ${expected}`,
  }
}

function validatedCheck(artifact: string, context: Record<string, unknown>): GateCheck {
  const validated = context[`${artifact}.validated`] as boolean | undefined
  return {
    criteria: `${artifact} validated`,
    result: validated ? 'pass' : 'fail',
    message: validated ? `${artifact} validated` : `${artifact} not validated`,
  }
}

export function allPass(checks: GateCheck[]): boolean {
  return checks.every(c => c.result === 'pass')
}

export function anyFail(checks: GateCheck[]): boolean {
  return checks.some(c => c.result === 'fail')
}
