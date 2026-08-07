'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceManager } from '@cocarr/datagrid';
import { workspaceApi } from '@cocarr/api-sdk';
import { InfoToast, ErrorToast } from '@cocarr/notifications';
import { Header } from '@cocarr/ui';
import { useCan } from '@cocarr/iam-sdk';

// Candidates — backed by cocarr-workspace-api.
//
// No longer a bare ListScreen: HIRE is the only way anyone enters onboarding,
// and it had no UI at all, so the note on this page used to tell people to call
// the API by hand. `renderRowExtra` is exactly the seam for that — the list
// stays generic and this page adds the one pipeline action it owns.
//
// `permission` is the base key — ResourceManager derives Add / Edit / Delete
// from `<permission>.create|update|delete`.
export default function Page() {
  const router = useRouter();
  const [hiring, setHiring] = useState(null);
  // Hiring converts a candidate into an employee, so it is an update on the
  // recruitment module — the same permission the API gates POST /:id/hire with.
  const canHire = useCan('workspace.recruitment.update');

  const hire = async (row, reload) => {
    setHiring(row.id);
    try {
      const res = await workspaceApi().post(`/candidates/${row.id}/hire`, {});
      const emp = res.data?.employee || res.data;
      InfoToast(`${[row.firstName, row.lastName].filter(Boolean).join(' ')} is now in onboarding`);
      await reload?.();
      // Straight to the workflow they just started — the next action is there,
      // not on this list.
      router.push('/dashboard/workspace/onboarding');
      return emp;
    } catch (e) {
      // 409 covers both "already hired" and "an employee with this email
      // exists"; the API's message says which, so surface it rather than
      // inventing one.
      ErrorToast(e?.response?.data?.error?.message || e?.response?.data?.error || 'Could not hire this candidate');
      return null;
    } finally { setHiring(null); }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Header title="Candidates" RightContent={() => null} />
      <p className="px-1 pt-3 text-xs text-[#757575]">
        Hiring pipeline. <strong>Hire</strong> converts a candidate into an employee at the profile
        stage and opens their onboarding — their employee code and staff login are issued when
        onboarding is approved, not here.
      </p>
      <ResourceManager
        api="workspace"
        permission="workspace.recruitment"
        searchPlaceholder="Search candidates"
        endpoint="/candidates"
        detailHref={(row) => `/dashboard/workspace/candidates/${row.id}`}
        createLabel="+ Add Candidate"
        columns={[
          { key: 'firstName', label: 'First' },
          { key: 'email', label: 'Email' },
          { key: 'positionTitle', label: 'Position' },
          { key: 'stage', label: 'Stage' },
          { key: 'createdAt', label: 'Added' },
        ]}
        fields={[
          { key: 'firstName', label: 'First name', type: 'text', required: true },
          { key: 'lastName', label: 'Last name', type: 'text' },
          { key: 'email', label: 'Email', type: 'text', required: true },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'positionTitle', label: 'Position title', type: 'text' },
          { key: 'departmentId', label: 'Department ID', type: 'text' },
          { key: 'source', label: 'Source', type: 'text' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        renderRowExtra={(row, reload) => {
          // A hired candidate keeps its row with stage 'hired' and a
          // convertedEmployeeId — offering Hire again would only earn a 409.
          if (!canHire || row.stage === 'hired' || row.convertedEmployeeId) {
            return row.stage === 'hired'
              ? <span className="text-[11px] font-semibold text-green-700">Hired</span>
              : null;
          }
          return (
            <button
              type="button"
              disabled={hiring === row.id}
              onClick={() => hire(row, reload)}
              className="text-xs font-semibold text-gray-900 hover:underline disabled:opacity-40"
            >
              {hiring === row.id ? 'Hiring…' : 'Hire'}
            </button>
          );
        }}
      />
    </div>
  );
}
