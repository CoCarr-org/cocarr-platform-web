'use client'
import React from 'react'
import Rides from '../rides/page'
// "Trips" = journeys that actually ran, i.e. finished bookings. Bookings
// (the parent page) covers every state including upcoming and cancelled.
export default function OperationsTrips() { return <Rides initialStatus='finished' /> }
