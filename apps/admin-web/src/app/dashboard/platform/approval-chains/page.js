'use client'
import React from 'react'
import { Header } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'

// IAM approval chains. The nav advertised this route with no page behind it.
export default function ApprovalChains() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Approval Chains' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        An ordered sequence of approvals a request must clear. IAM owns the shape of the chain — who
        approves, in what order — while the requesting product owns the request itself, bound by
        <code className='mx-1 text-[11px]'>requestType</code> (e.g.
        <code className='mx-1 text-[11px]'>workspace.accessRequest</code>).
      </p>
      <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-4 py-3 mx-1 mt-3'>
        <strong>Chains exist; per-request decisions do not.</strong> The steps of a chain are stored,
        but the per-request step decisions are not implemented yet, so an approved request still
        leaves <code className='text-[11px]'>iamApplied</code> false in Workspace. Editing a chain
        here changes what <em>would</em> be asked, not what is enforced today.
      </div>
      <ResourceManager
        api='platform'
        permission='platform.approvalChains'
        endpoint='/approval-chains'
        searchPlaceholder='Search by key, name or request type'
        createLabel='+ Add chain'
        emptyText='No approval chains yet.'
        columns={[
          { key: 'key', label: 'Key' },
          { key: 'name', label: 'Name' },
          { key: 'requestType', label: 'Request type' },
          { key: 'isActive', label: 'Active' },
          { key: 'createdAt', label: 'Created' },
        ]}
        fields={[
          { key: 'key', label: 'Key', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'requestType', label: 'Request type', type: 'text', required: true },
          { key: 'organizationId', label: 'Organization id', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'isActive', label: 'Active', type: 'boolean' },
        ]}
      />
    </div>
  )
}
