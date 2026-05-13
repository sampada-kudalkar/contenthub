import { useState, useCallback } from 'react'
import type { Recommendation, BusinessMetrics, RecStatus, AssignChoice, RecCategory } from './recTypes'
import { seedRecommendations, seedMetrics } from './recSeedData'

export interface RecStoreState {
  recommendations: Recommendation[]
  metrics: BusinessMetrics
  activeTab: RecStatus | 'all'
  showFilterPanel: boolean
  filterTypes: RecCategory[]
  filterEffort: string[]
}

export interface RecStoreActions {
  setActiveTab: (tab: RecStatus | 'all') => void
  toggleFilterPanel: () => void
  setFilterTypes: (types: RecCategory[]) => void
  setFilterEffort: (effort: string[]) => void
  clearFilters: () => void
  acceptRec: (id: string, assignChoice: AssignChoice, assignedTo?: string) => void
  rejectRec: (id: string) => void
  completeRec: (id: string) => void
  revertToPending: (id: string) => void
}

export type RecStore = RecStoreState & RecStoreActions

export function useRecStore(): RecStore {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(seedRecommendations)
  const [metrics, setMetrics] = useState<BusinessMetrics>(seedMetrics)
  const [activeTab, setActiveTab] = useState<RecStatus | 'all'>('pending')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterTypes, setFilterTypes] = useState<RecCategory[]>([])
  const [filterEffort, setFilterEffort] = useState<string[]>([])

  const toggleFilterPanel = useCallback(() => setShowFilterPanel(p => !p), [])

  const clearFilters = useCallback(() => {
    setFilterTypes([])
    setFilterEffort([])
  }, [])

  const acceptRec = useCallback((id: string, assignChoice: AssignChoice, assignedTo?: string) => {
    setRecommendations(recs => recs.map(r =>
      r.id === id
        ? { ...r, status: 'accepted' as RecStatus, assignChoice, assignedTo: assignedTo ?? null, acceptedAt: new Date().toISOString(), acceptedBy: 'James Smith' }
        : r
    ))
    setMetrics(m => ({ ...m, searchAiScore: Math.min(100, m.searchAiScore + 2) }))
  }, [])

  const rejectRec = useCallback((id: string) => {
    setRecommendations(recs => recs.map(r =>
      r.id === id ? { ...r, status: 'rejected' as RecStatus } : r
    ))
  }, [])

  const completeRec = useCallback((id: string) => {
    setRecommendations(recs => recs.map(r =>
      r.id === id ? { ...r, status: 'completed' as RecStatus, completedAt: new Date().toISOString() } : r
    ))
    setMetrics(m => ({
      ...m,
      searchAiScore: Math.min(100, m.searchAiScore + 4),
      visibility: Math.min(100, m.visibility + 2),
      citationShare: Math.min(100, m.citationShare + 3),
    }))
  }, [])

  const revertToPending = useCallback((id: string) => {
    setRecommendations(recs => recs.map(r =>
      r.id === id
        ? { ...r, status: 'pending' as RecStatus, acceptedAt: null, acceptedBy: null, assignChoice: null, assignedTo: null }
        : r
    ))
  }, [])

  return {
    recommendations,
    metrics,
    activeTab,
    showFilterPanel,
    filterTypes,
    filterEffort,
    setActiveTab,
    toggleFilterPanel,
    setFilterTypes,
    setFilterEffort,
    clearFilters,
    acceptRec,
    rejectRec,
    completeRec,
    revertToPending,
  }
}
