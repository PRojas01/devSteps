import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { runScaffold } from '../src/scaffold.js'
import { DS_V1 } from '../src/standard/ds-v1.js'
import { validateProjectAgainstStandard } from '../src/standard/validator.js'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('runScaffold', () => {
  it('creates a beginner project that satisfies DS-v1 file checks', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devsteps-scaffold-'))
    tempDirs.push(root)

    await runScaffold(root, {
      name: 'Audit Scaffold',
      type: 'web-app',
      description: 'Beginner audit project',
      stack: 'typescript,node',
      force: true,
    })

    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const entryFile = readFileSync(join(root, 'src/index.ts'), 'utf-8')
    const results = validateProjectAgainstStandard(root, DS_V1.norms)
    const failures = results.filter((result) => result.result === 'fail')

    expect(entryFile).toMatch(/^\/\*\*/)
    expect(entryFile).not.toContain('console.log')
    expect(packageJson.scripts?.dev).toBe('tsx watch src/index.ts')
    expect(packageJson.scripts?.validate).toBe('devsteps validate')
    expect(packageJson.devDependencies?.tsx).toBeDefined()
    expect(packageJson.devDependencies?.eslint).toBeDefined()
    expect(packageJson.devDependencies?.prettier).toBeDefined()
    expect(failures).toEqual([])
  })
})
