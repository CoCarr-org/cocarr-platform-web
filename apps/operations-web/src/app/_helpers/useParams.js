'use client'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import { RouteParamsContext } from './RouteParamsContext'

// Custom useParams hook that extracts ID from pathname
export function useParams() {
  const pathname = usePathname()

  // RouteParamsContext is created with a default value ({}), so this never
  // throws even without a provider above it — no try/catch needed, and
  // wrapping a hook call in one is a rules-of-hooks violation anyway (ESLint
  // can't verify a hook behaves consistently across renders inside a
  // conditional-like construct).
  const routeParams = useContext(RouteParamsContext) || {}

  // Extract directly from pathname
  const segments = pathname.split('/').filter(Boolean)
  
  // Route patterns that have dynamic id segments
  const idPatterns = ['rides', 'hosts', 'vehicles', 'users', 'availability-schedule']
  // Segments that are not IDs but route paths
  const excludedSegments = ['payment', 'due', 'start-ride', 'end-ride', 'reviews', 'rides', 'vehicles', 'settings', 'dashboard', 'preferences', 'protection-plan', 'membership-types', 'cities', 'brands', 'pickup-points']
  
  // Find the most relevant ID (the one closest to the current route)
  // We want the ID that appears earliest in the path (most relevant to current context)
  let foundId = null
  let bestPatternIndex = segments.length
  
  for (const pattern of idPatterns) {
    const index = segments.indexOf(pattern)
    if (index !== -1 && index < segments.length - 1) {
      const potentialId = segments[index + 1]
      // Check if it's actually an ID (not another route segment)
      if (potentialId && !excludedSegments.includes(potentialId)) {
        // Use the pattern that appears earliest (leftmost) in the path
        if (index < bestPatternIndex) {
          foundId = potentialId
          bestPatternIndex = index
        }
      }
    }
  }
  
  if (foundId) {
    return { id: foundId, ...routeParams }
  }
  
  return routeParams
}

