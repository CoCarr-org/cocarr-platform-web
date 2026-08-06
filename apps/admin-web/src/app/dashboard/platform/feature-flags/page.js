'use client'
import React from 'react'
import { Header } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'

// IAM feature flags. The nav advertised this route with no page behind it.
export default function FeatureFlags() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Feature Flags' RightContent={() => null} />
      <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-4 py-3 mx-1 mt-3'>
        <strong>Nothing branches on these yet.</strong> Flags are surfaced on the navigation payload
        and read by no server-side path, so turning one off does not currently disable anything. A
        flag nobody reads looks exactly like a switch that works — treat these as declarations of
        intent until something consumes them.
      </div>
      <ResourceManager
        api='platform'
        permission='platform.featureFlags'
        endpoint='/feature-flags'
        searchPlaceholder='Search by key or name'
        createLabel='+ Add flag'
        emptyText='No feature flags yet.'
        columns={[
          { key: 'key', label: 'Key' },
          { key: 'name', label: 'Name' },
          { key: 'isEnabled', label: 'Enabled' },
          { key: 'scopeType', label: 'Scope' },
          { key: 'createdAt', label: 'Created' },
        ]}
        fields={[
          { key: 'key', label: 'Key', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'isEnabled', label: 'Enabled', type: 'boolean' },
          {
            key: 'scopeType',
            label: 'Scope type',
            type: 'select',
            options: [
              { value: 'global', label: 'Global' },
              { value: 'organization', label: 'Organization' },
              { value: 'principal', label: 'Principal' },
            ],
          },
          { key: 'scopeId', label: 'Scope id', type: 'text' },
        ]}
      />
    </div>
  )
}
