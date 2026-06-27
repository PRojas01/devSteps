import { describe, it, expect } from 'vitest'
import { DS_V1, getNormById, getNormsByCategory, getNormsByScope } from '../src/standard/ds-v1.js'

describe('DS-v1 Standard', () => {
  it('should have 24 norms', () => {
    expect(DS_V1.norms.length).toBe(24)
    expect(DS_V1.id).toBe('ds-v1')
    expect(DS_V1.name).toBe('devSteps Standard v1')
  })

  it('should have all categories represented', () => {
    const categories = [...new Set(DS_V1.norms.map(n => n.category))]
    expect(categories).toContain('documentation')
    expect(categories).toContain('security')
    expect(categories).toContain('architecture')
    expect(categories).toContain('quality')
    expect(categories).toContain('testing')
    expect(categories).toContain('git')
    expect(categories).toContain('release')
    expect(categories).toContain('project-setup')
  })

  it('should have unique IDs', () => {
    const ids = DS_V1.norms.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should find norm by ID', () => {
    const norm = getNormById('DS-010')
    expect(norm).toBeDefined()
    expect(norm?.name).toBe('No secrets in code')
    expect(norm?.severity).toBe('error')
    expect(norm?.category).toBe('security')
  })

  it('should return undefined for unknown norm', () => {
    expect(getNormById('DS-999')).toBeUndefined()
  })

  it('should filter norms by category', () => {
    const security = getNormsByCategory('security')
    expect(security.length).toBeGreaterThanOrEqual(4)
    expect(security.every(n => n.category === 'security')).toBe(true)
  })

  it('should filter norms by scope', () => {
    const tsNorms = getNormsByScope('src/index.ts')
    expect(tsNorms.length).toBeGreaterThan(0)
    expect(tsNorms.some(n => n.id === 'DS-002')).toBe(true) // module comment
  })

  it('should have validation config for all norms', () => {
    for (const norm of DS_V1.norms) {
      expect(norm.validation).toBeDefined()
      expect(['exists', 'regex', 'content', 'structure', 'custom']).toContain(norm.validation.type)
    }
  })

  it('should have aiPrompt for all norms', () => {
    for (const norm of DS_V1.norms) {
      expect(norm.aiPrompt).toBeTruthy()
      expect(typeof norm.aiPrompt).toBe('string')
    }
  })

  it('should have severity set correctly', () => {
    const errors = DS_V1.norms.filter(n => n.severity === 'error')
    const warnings = DS_V1.norms.filter(n => n.severity === 'warning')
    expect(errors.length).toBe(14)
    expect(warnings.length).toBe(10)
  })

  it('should have DS-090 for project-setup', () => {
    const norm = getNormById('DS-090')
    expect(norm?.name).toBe('package.json present')
    expect(norm?.validation.type).toBe('exists')
    expect(norm?.scope).toContain('package.json')
  })
})
