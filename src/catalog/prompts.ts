/** Module purpose: supports devSteps prompts functionality. */
import type { AgentPrompt, SystemId, PipelineContext, ArtifactRecord } from '../types.js'

export function buildAgentPrompt(
  systemId: SystemId,
  stepId: string,
  role: string,
  context: PipelineContext,
): AgentPrompt {
  const artifactList = [...context.artifacts.values()]
  const contextPaths = artifactList.map(a => a.path)

  const prompt = generatePrompt(systemId, stepId, role, artifactList)

  return {
    systemId,
    stepId,
    role,
    prompt,
    context: contextPaths,
    output: [],
  }
}

function generatePrompt(
  systemId: SystemId, stepId: string, role: string, artifacts: ArtifactRecord[],
): string {
  const artifactSection = artifacts.length > 0
    ? `\nExisting artifacts:\n${artifacts.map(a => `  - ${a.path} (${a.type})`).join('\n')}`
    : '\nNo existing artifacts.'

  const rolePrompts: Record<string, string> = {
    'execute': `Execute the "${stepId}" step. Complete all required work and produce the expected artifacts.${artifactSection}`,
    'support': `Support the "${stepId}" step. Provide analysis, research, or review as needed.${artifactSection}`,
    'approve': `Review and approve the results of "${stepId}". Verify quality, completeness, and compliance with DS-v1.${artifactSection}`,
    'governance': `Govern the "${stepId}" step. Ensure compliance with security, quality, and process standards.${artifactSection}`,
  }

  return `System: ${systemId}\nRole: ${role}\nStep: ${stepId}\n\n${rolePrompts[role] ?? rolePrompts['execute']}`
}

export function buildStepInstructions(stepId: string, stepName: string, description: string): string {
  return [
    `## Step: ${stepId} -- ${stepName}`,
    '',
    description,
    '',
    '### Instructions',
    '1. Review the context artifacts from previous steps',
    '2. Complete the work described above',
    '3. Validate output against DS-v1 standard',
    '4. Register the produced artifacts',
    '',
    '### Output',
    '- All required artifacts',
    '- Validation results',
    '- Step completion report',
  ].join('\n')
}
