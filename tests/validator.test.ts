import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateProjectAgainstStandard } from '../src/standard/validator.js'
import type { NormDefinition } from '../src/types.js'

const tempDirs: string[] = []

function makeNorm(overrides: Partial<NormDefinition>): NormDefinition {
  return {
    id: 'TEST-001',
    name: 'Test norm',
    description: 'Test description',
    category: 'documentation',
    severity: 'error',
    scope: ['README.md'],
    validation: { type: 'exists' },
    aiPrompt: 'Test prompt',
    ...overrides,
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('validateProjectAgainstStandard', () => {
  it('matches wildcard scopes like docs/adr-*.md', () => {
    const root = mkdtempSync(join(tmpdir(), 'devsteps-validator-'))
    tempDirs.push(root)
    mkdirSync(join(root, 'docs'))
    writeFileSync(join(root, 'docs', 'adr-001-test.md'), '# ADR-001: Test\n', 'utf-8')

    const results = validateProjectAgainstStandard(root, [
      makeNorm({
        scope: ['docs/adr-*.md'],
        validation: { type: 'content', pattern: '# ADR-\\d+' },
      }),
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.result).toBe('pass')
  })

  it('marks global rules as partial instead of failing on empty scope', () => {
    const root = mkdtempSync(join(tmpdir(), 'devsteps-validator-'))
    tempDirs.push(root)

    const results = validateProjectAgainstStandard(root, [
      makeNorm({
        id: 'TEST-070',
        scope: [],
        validation: { type: 'regex', patterns: ['^feat: .+'] },
      }),
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.result).toBe('partial')
  })
})
