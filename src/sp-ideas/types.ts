/** SP-Ideas type definitions: Idea lifecycle, viability, priority, and statistics types */
export type IdeaStatus = 'draft' | 'submitted' | 'evaluated' | 'accepted' | 'rejected' | 'archived'
export type IdeaCategory = 'feature' | 'product' | 'improvement' | 'bugfix' | 'research' | 'infrastructure' | 'other'
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'backlog'
export type Effort = 'small' | 'medium' | 'large' | 'xlarge'

export interface Idea {
  id: string
  title: string
  description: string
  category: IdeaCategory
  problem: string
  audience: string
  impact: string
  effort: Effort
  status: IdeaStatus
  priority: Priority
  tags: string[]
  score: number
  viability?: ViabilityResult
  notes: string[]
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  projectName?: string
}

export interface ViabilityResult {
  weighted: number
  verdict: 'GO' | 'ITERATE' | 'KILL'
  technical: number
  economic: number
  temporal: number
  risk: number
}

export interface Stats {
  total: number
  accepted: number
  rejected: number
  pending: number
  avgScore: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
}
