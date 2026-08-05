'use client'
// SUPERSEDED — not in the nav, and /dashboard/admin-roles now resolves to the
// Teams & Access page instead.
//
// This wrapped `PermissionMatrix`, the legacy role×module grid. Nothing ever
// read that matrix to gate a request, so editing it changed nothing — while
// the team/level grid next door was the one actually enforced. Two permission
// screens, one of them decorative, meant an admin could edit the wrong one and
// reasonably conclude permissions were broken.
//
// Kept only so the import in the catch-all router does not dangle. Delete both
// this and PermissionMatrix once nothing references them.
import React from 'react'
import Header from '@/app/_components/Header'
import PermissionMatrix from '@/app/_components/PermissionMatrix'

export default function SettingsRoles() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Roles & Permissions'} RightContent={() => null} />
      <PermissionMatrix />
    </div>
  )
}
