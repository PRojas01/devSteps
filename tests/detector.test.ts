import { describe, it, expect } from 'vitest'
import { getAvailableSystems, isSystemAvailable } from '../src/launchers/index.js'

describe('System Detector', () => {
  it('should list all 6 systems', () => {
    const systems = getAvailableSystems()
    expect(systems.length).toBe(6)
    expect(systems).toContain('opencode')
    expect(systems).toContain('claude')
    expect(systems).toContain('codex')
    expect(systems).toContain('human')
    expect(systems).toContain('devcontrol')
    expect(systems).toContain('auto')
  })

  it('should identify valid systems', () => {
    expect(isSystemAvailable('opencode')).toBe(true)
    expect(isSystemAvailable('human')).toBe(true)
  })

  it('should reject unknown systems', () => {
    expect(isSystemAvailable('unknown-tool')).toBe(false)
    expect(isSystemAvailable('vscode')).toBe(false)
  })
})
