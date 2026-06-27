import { describe, it, expect, vi } from 'vitest'
import { evaluateEntryCriteria, evaluateExitCriteria, allPass, anyFail } from '../src/engine/gates.js'
import { createContext, addArtifact, getArtifact, getArtifactsByStep } from '../src/engine/context.js'
import type { PipelineContext, StepDefinition, SystemResult } from '../src/types.js'

describe('Gates', () => {
  it('should pass when artifact exists', () => {
    const checks = evaluateEntryCriteria(['decision.md:exists'], { artifacts: ['decision.md'] })
    expect(checks[0].result).toBe('pass')
    expect(checks[0].message).toContain('found')
  })

  it('should fail when artifact missing', () => {
    const checks = evaluateEntryCriteria(['decision.md:exists'], { artifacts: [] })
    expect(checks[0].result).toBe('fail')
    expect(checks[0].message).toContain('not found')
  })

  it('should pass equality check', () => {
    const checks = evaluateEntryCriteria(['decision:equals=GO'], { decision: 'GO' })
    expect(checks[0].result).toBe('pass')
  })

  it('should fail equality check', () => {
    const checks = evaluateEntryCriteria(['decision:equals=GO'], { decision: 'KILL' })
    expect(checks[0].result).toBe('fail')
  })

  it('should pass contains check', () => {
    const checks = evaluateExitCriteria(['report:contains=SUCCESS'], { report: 'All tests SUCCESS' })
    expect(checks[0].result).toBe('pass')
  })

  it('should allPass return true when all pass', () => {
    const checks = [
      { criteria: 'a', result: 'pass' as const, message: 'ok' },
      { criteria: 'b', result: 'pass' as const, message: 'ok' },
    ]
    expect(allPass(checks)).toBe(true)
  })

  it('should allPass return false when any fails', () => {
    const checks = [
      { criteria: 'a', result: 'pass' as const, message: 'ok' },
      { criteria: 'b', result: 'fail' as const, message: 'fail' },
    ]
    expect(allPass(checks)).toBe(false)
  })

  it('should anyFail return true when any fails', () => {
    const checks = [
      { criteria: 'a', result: 'pass' as const, message: 'ok' },
      { criteria: 'b', result: 'fail' as const, message: 'fail' },
    ]
    expect(anyFail(checks)).toBe(true)
  })

  it('should anyFail return false when all pass', () => {
    const checks = [
      { criteria: 'a', result: 'pass' as const, message: 'ok' },
      { criteria: 'b', result: 'pass' as const, message: 'ok' },
    ]
    expect(anyFail(checks)).toBe(false)
  })
})

describe('Context', () => {
  it('should create context with defaults', () => {
    const ctx = createContext('test-pipeline', { project: 'test' })
    expect(ctx.pipelineId).toBe('test-pipeline')
    expect(ctx.status).toBe('idle')
    expect(ctx.metadata.project).toBe('test')
    expect(ctx.artifacts.size).toBe(0)
  })

  it('should add and retrieve artifact', () => {
    const ctx = createContext('test')
    addArtifact(ctx, { id: 'doc1', stepId: 'step1', path: 'docs/req.md', type: 'doc', validated: false })
    expect(ctx.artifacts.size).toBe(1)
    const art = getArtifact(ctx, 'doc1')
    expect(art?.path).toBe('docs/req.md')
    expect(art?.type).toBe('doc')
  })

  it('should get artifacts by step', () => {
    const ctx = createContext('test')
    addArtifact(ctx, { id: 'a1', stepId: 'step1', path: 'doc1.md', type: 'doc', validated: false })
    addArtifact(ctx, { id: 'a2', stepId: 'step1', path: 'doc2.md', type: 'doc', validated: false })
    addArtifact(ctx, { id: 'a3', stepId: 'step2', path: 'code.ts', type: 'code', validated: false })
    const step1Arts = getArtifactsByStep(ctx, 'step1')
    expect(step1Arts.length).toBe(2)
    expect(step1Arts.map(a => a.id)).toEqual(['a1', 'a2'])
  })
})
