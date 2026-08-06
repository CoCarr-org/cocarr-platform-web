'use client'
import React, { createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'

export const RouteParamsContext = createContext({})

export function RouteParamsProvider({ children }) {
  const pathname = usePathname()
  
  // Extract params from pathname
  const getParams = () => {
    const segments = pathname.split('/').filter(Boolean)
    const params = {}
    
    // Route patterns that have dynamic id segments
    const routePatterns = [
      { route: 'rides', index: segments.indexOf('rides') },
      { route: 'hosts', index: segments.indexOf('hosts') },
      { route: 'vehicles', index: segments.indexOf('vehicles') },
      { route: 'users', index: segments.indexOf('users') },
      { route: 'availability-schedule', index: segments.indexOf('availability-schedule') }
    ]
    
    // Find the first matching route pattern
    const matchingRoute = routePatterns.find(r => r.index !== -1 && segments[r.index + 1])
    
    if (matchingRoute) {
      const idIndex = matchingRoute.index + 1
      const idValue = segments[idIndex]
      
      // Check if it's actually an ID (not another route segment)
      const excludedSegments = ['payment', 'due', 'start-ride', 'end-ride', 'reviews', 'rides', 'vehicles', 'settings']
      if (idValue && !excludedSegments.includes(idValue)) {
        params.id = idValue
      }
    }
    
    return params
  }
  
  const params = getParams()
  
  return (
    <RouteParamsContext.Provider value={params}>
      {children}
    </RouteParamsContext.Provider>
  )
}

export function useRouteParams() {
  const context = useContext(RouteParamsContext)
  return context
}

