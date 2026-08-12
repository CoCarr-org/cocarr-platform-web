'use client'
import { createContext, useContext } from 'react'

// The vehicle record, fetched once by the tab layout and read by the tabs.
// Its own module rather than an export from layout.js — a layout is a framework
// entry point and the App Router reserves what may be exported from one.
export const VehicleContext = createContext({ vehicle: null, loading: true, error: '', reload: () => {} })

export const useVehicle = () => useContext(VehicleContext)
