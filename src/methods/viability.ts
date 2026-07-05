/** Module purpose: supports devSteps viability functionality. */
import type { ViabilityConfig, ViabilityResult, ViabilityDetail } from '../types.js'

const DEFAULT_CONFIG: ViabilityConfig = {
  dimensions: [
    {
      id: 'technical',
      name: 'Técnica',
      criteria: [
        { name: 'Stack conocido', description: 'El equipo domina el stack necesario?', scale: [1, 5], labels: { 1: 'Stack desconocido', 2: 'Poco conocido', 3: 'Medio', 4: 'Bien dominado', 5: 'Experto' } },
        { name: 'Complejidad', description: 'Qué tan complejo es técnicamente?', scale: [1, 5], labels: { 1: 'Extremadamente complejo', 2: 'Complejo', 3: 'Moderado', 4: 'Simple', 5: 'Trivial' } },
        { name: 'Recursos disponibles', description: 'Tenemos el equipo y tiempo?', scale: [1, 5], labels: { 1: 'Sin recursos', 2: 'Muy pocos', 3: 'Suficientes', 4: 'Bien equipados', 5: 'Sobrados' } },
      ],
    },
    {
      id: 'economic',
      name: 'Económica',
      criteria: [
        { name: 'Retorno estimado', description: 'El retorno justifica la inversión?', scale: [1, 5], labels: { 1: 'Negativo', 2: 'Bajo', 3: 'Moderado', 4: 'Bueno', 5: 'Alto' } },
        { name: 'Costo desarrollo', description: 'El costo de desarrollo es manejable?', scale: [1, 5], labels: { 1: 'Inviable', 2: 'Muy alto', 3: 'Aceptable', 4: 'Bajo', 5: 'Mínimo' } },
        { name: 'Modelo de ingreso', description: 'Hay un modelo de ingreso claro?', scale: [1, 5], labels: { 1: 'No hay modelo', 2: 'Poco claro', 3: 'Potencial', 4: 'Claro', 5: 'Probado' } },
      ],
    },
    {
      id: 'temporal',
      name: 'Temporal',
      criteria: [
        { name: 'Deadline realista', description: 'El deadline es alcanzable?', scale: [1, 5], labels: { 1: 'Imposible', 2: 'Muy ajustado', 3: 'Justo', 4: 'Razonable', 5: 'Sobrado' } },
        { name: 'Dependencias externas', description: 'Dependemos de terceros?', scale: [1, 5], labels: { 1: 'Muchas críticas', 2: 'Varias', 3: 'Algunas', 4: 'Pocas', 5: 'Ninguna' } },
      ],
    },
    {
      id: 'risk',
      name: 'Riesgo',
      criteria: [
        { name: 'Riesgo técnico', description: 'Qué tan riesgoso es técnicamente?', scale: [1, 5], labels: { 1: 'Muy alto', 2: 'Alto', 3: 'Moderado', 4: 'Bajo', 5: 'Trivial' } },
        { name: 'Riesgo de mercado', description: 'Qué tan riesgoso es el mercado?', scale: [1, 5], labels: { 1: 'Muy alto', 2: 'Alto', 3: 'Moderado', 4: 'Bajo', 5: 'Inexistente' } },
        { name: 'Riesgo legal/regulatorio', description: 'Hay riesgos legales?', scale: [1, 5], labels: { 1: 'Muy alto', 2: 'Alto', 3: 'Moderado', 4: 'Bajo', 5: 'Sin riesgo' } },
      ],
    },
  ],
  weights: { technical: 0.3, economic: 0.3, temporal: 0.2, risk: 0.2 },
  threshold: { go: 4.0, iterate: 2.5, kill: 2.5 },
}

export function evaluateViability(
  scores: Record<string, number[]>,
  config?: Partial<ViabilityConfig>,
): ViabilityResult {
  const dimensions = config?.dimensions ?? DEFAULT_CONFIG.dimensions
  const weights = config?.weights ?? DEFAULT_CONFIG.weights
  const threshold = config?.threshold ?? DEFAULT_CONFIG.threshold
  const details: ViabilityDetail[] = []

  for (const dim of dimensions) {
    const dimScores = scores[dim.id] ?? []
    const dimResult: ViabilityDetail = {
      dimension: dim.name,
      average: 0,
      criteria: [],
    }

    for (let i = 0; i < dim.criteria.length; i++) {
      const criterion = dim.criteria[i]
      const score = dimScores[i] ?? 3
      const label = criterion.labels[score] ?? `${score}/5`
      dimResult.criteria.push({ name: criterion.name, score, label })
    }

    dimResult.average = dimResult.criteria.reduce((s, c) => s + c.score, 0) / dimResult.criteria.length
    details.push(dimResult)
  }

  const dimensionAverages: Record<string, number> = {}
  for (const [idx, d] of details.entries()) {
    const dimId = dimensions[idx]?.id ?? d.dimension.toLowerCase()
    dimensionAverages[dimId] = d.average
  }

  let weighted = 0
  for (const [dimKey, avg] of Object.entries(dimensionAverages)) {
    const weight = weights[dimKey] ?? 0.25
    weighted += avg * weight
  }

  const verdict = weighted >= threshold.go ? 'GO' as const
    : weighted >= threshold.iterate ? 'ITERATE' as const
    : 'KILL' as const

  return { scores: dimensionAverages, weighted: Math.round(weighted * 100) / 100, verdict, details }
}

export function getViabilityConfig(): ViabilityConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG))
}
