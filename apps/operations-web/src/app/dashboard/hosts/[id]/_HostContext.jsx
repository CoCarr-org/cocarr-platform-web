'use client'
import { createContext, useContext } from 'react'

// The host record, fetched once by the tab layout and read by the tabs.
//
// In its own module rather than exported from layout.js: a layout is a
// framework entry point, and the App Router reserves what may be exported from
// one. A hook that happens to live there is a hook that breaks the day Next
// tightens that contract.
export const HostContext = createContext({ host: null, loading: true, error: '', reload: () => {} })

export const useHost = () => useContext(HostContext)
