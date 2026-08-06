'use client'
import React from 'react'
import { Header } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'

// IAM organizations — the scope an assignment can be narrowed to.
//
// The nav has advertised this route since the taxonomy was seeded, and there
// was no page behind it, so the sidebar entry 404'd.
export default function Organizations() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Organizations' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Organizations scope a role assignment to part of the business. Note that scope is currently
        <strong> reported but not enforced</strong> — resolution carries the organization on the
        assignment without narrowing the permissions by it, so treat this as structure, not access
        control, until every call site passes the organization it acts in.
      </p>
      <ResourceManager
        api='platform'
        permission='platform.organizations'
        endpoint='/organizations'
        searchPlaceholder='Search by key or name'
        createLabel='+ Add organization'
        emptyText='No organizations yet.'
        columns={[
          { key: 'key', label: 'Key' },
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'isActive', label: 'Active' },
          { key: 'createdAt', label: 'Created' },
        ]}
        fields={[
          { key: 'key', label: 'Key', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          {
            key: 'type',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'company', label: 'Company' },
              { value: 'division', label: 'Division' },
              { value: 'branch', label: 'Branch' },
              { value: 'team', label: 'Team' },
            ],
          },
          { key: 'parentId', label: 'Parent organization id', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'isActive', label: 'Active', type: 'boolean' },
        ]}
      />
    </div>
  )
}
