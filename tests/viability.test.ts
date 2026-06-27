import { describe, it, expect } from 'vitest'
import { evaluateViability, getViabilityConfig } from '../src/methods/viability.js'

describe('Viability Matrix', () => {
  it('should return GO for high scores', () => {
    const result = evaluateViability({
      technical: [5, 5, 5],
      economic: [5, 5, 5],
      temporal: [5, 5],
      risk: [5, 5, 5],
    })
    expect(result.verdict).toBe('GO')
    expect(result.weighted).toBeGreaterThanOrEqual(4.0)
  })

  it('should return KILL for low scores', () => {
    const result = evaluateViability({
      technical: [1, 1, 1],
      economic: [1, 1, 1],
      temporal: [1, 1],
      risk: [1, 1, 1],
    })
    expect(result.verdict).toBe('KILL')
    expect(result.weighted).toBeLessThan(2.5)
  })

  it('should return ITERATE for medium scores', () => {
    const result = evaluateViability({
      technical: [3, 3, 3],
      economic: [3, 3, 3],
      temporal: [3, 3],
      risk: [3, 3, 3],
    })
    expect(result.verdict).toBe('ITERATE')
  })

  it('should calculate weighted score correctly', () => {
    const result = evaluateViability({
      technical: [5, 5, 5],
      economic: [1, 1, 1],
      temporal: [1, 1],
      risk: [1, 1, 1],
    })
    const tech = 5.0 // avg of [5,5,5]
    const eco = 1.0 // avg of [1,1,1]
    const temp = 1.0 // avg of [1,1]
    const risk = 1.0 // avg of [1,1,1]
    const expected = tech * 0.3 + eco * 0.3 + temp * 0.2 + risk * 0.2
    expect(result.weighted).toBe(expected)
  })

  it('should provide detailed dimension scores', () => {
    const result = evaluateViability({
      technical: [4, 5, 4],
      economic: [3, 4, 3],
      temporal: [5, 4],
      risk: [4, 4, 5],
    })
    expect(result.details.length).toBe(4)
    expect(result.details[0].dimension).toBe('Técnica')
    expect(result.details[0].criteria.length).toBe(3)
    expect(result.details[0].average).toBeGreaterThan(0)
  })

  it('should label scores correctly', () => {
    const result = evaluateViability({
      technical: [5, 1, 3],
      economic: [3, 3, 3],
      temporal: [3, 3],
      risk: [3, 3, 3],
    })
    const techCriterias = result.details[0].criteria
    expect(techCriterias[0].label).toBe('Experto')
    expect(techCriterias[1].label).toBe('Extremadamente complejo')
  })

  it('should accept partial configuration', () => {
    const result = evaluateViability(
      { technical: [5, 5, 5], economic: [5, 5, 5], temporal: [5, 5], risk: [5, 5, 5] },
      { threshold: { go: 4.5, iterate: 3.0, kill: 3.0 } },
    )
    expect(result.verdict).toBe('GO')
    expect(result.weighted).toBeGreaterThanOrEqual(4.5)
  })

  it('should provide default config', () => {
    const cfg = getViabilityConfig()
    expect(cfg.dimensions.length).toBe(4)
    expect(cfg.dimensions[0].id).toBe('technical')
    expect(cfg.dimensions[0].criteria.length).toBe(3)
    expect(cfg.weights.technical).toBe(0.3)
    expect(cfg.weights.economic).toBe(0.3)
    expect(cfg.weights.temporal).toBe(0.2)
    expect(cfg.weights.risk).toBe(0.2)
    expect(cfg.threshold.go).toBe(4.0)
    expect(cfg.threshold.kill).toBe(2.5)
  })
})
