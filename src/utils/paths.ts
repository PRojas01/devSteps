/** Module purpose: supports devSteps paths functionality. */
import { resolve } from 'path'

export const DEVSTEPS_DIR = '.devsteps'
export const CHECKPOINT_DIR = '.devsteps/checkpoints'
export const CONTEXT_FILE = '.devsteps/context.json'
export const CONFIG_FILE = 'devsteps.yaml'

export function getDevstepsDir(root: string): string {
  return resolve(root, DEVSTEPS_DIR)
}

export function getCheckpointDir(root: string): string {
  return resolve(root, CHECKPOINT_DIR)
}

export function getContextFilePath(root: string): string {
  return resolve(root, CONTEXT_FILE)
}

export function getConfigFilePath(root: string): string {
  return resolve(root, CONFIG_FILE)
}
