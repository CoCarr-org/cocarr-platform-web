'use client';
import React, { useState } from 'react';
import { ResourceManager } from '@cocarr/datagrid';
import { workspaceApi } from '@cocarr/api-sdk';
import { InfoToast, ErrorToast } from '@cocarr/notifications';
import { Header } from '@cocarr/ui';
import { useCan } from '@cocarr/iam-sdk';

// JOB POSTINGS — what the public careers site advertises, and the approval
// workflow behind it.
//
// The status tabs are the whole point: Active (published) is what's live,
// Waiting for approval is the review queue, Draft is work-in-progress, Closed is
// filled/paused. A posting moves draft → submit → (approve) → published, so
// "who can post" (update) and "who can approve a post for the public" (approve)
// are separate buttons gated on separate permissions.
const TABS = [
  { key: 'published', label: 'Active' },
  { key: 'pending_approval', label: 'Waiting for approval' },
  { key: 'draft', label: 'Draft' },
  { key: 'closed', label: 'Closed' },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

export default function Page() {
  const [status, setStatus] = useState('published');
  const [busy, setBusy] = useState(null);
  const canUpdate = useCan('workspace.recruitment.update');
  const canApprove = useCan('workspace.recruitment.approve');

  const act = async (id, run, reload) => {
    setBusy(id);
    try { await run(); await reload?.(); } catch (e) {
      ErrorToast(e?.response?.data?.error?.message || e?.response?.data?.error || 'Action failed');
    } finally { setBusy(null); }
  };

  const submit = (row, reload) => act(row.id, async () => {
    await workspaceApi().post(`/job-postings/${row.id}/submit`);
    InfoToast('Submitted for approval');
  }, reload);
  const approve = (row, reload) => act(row.id, async () => {
    await workspaceApi().post(`/job-postings/${row.id}/approve`);
    InfoToast('Approved — now live on the careers site');
  }, reload);
  const reject = (row, reload) => {
    const note = window.prompt('Reason for sending this back to draft (shown to the poster):');
    if (note === null) return;
    return act(row.id, async () => {
      await workspaceApi().post(`/job-postings/${row.id}/reject`, { note });
      InfoToast('Sent back to draft');
    }, reload);
  };
  const setStatusTo = (row, next, msg, reload) => act(row.id, async () => {
    await workspaceApi().post(`/job-postings/${row.id}/status`, { status: next });
    InfoToast(msg);
  }, reload);

  return (
    <div className="mx-auto max-w-7xl">
      <Header title="Jobs" RightContent={() => null} />
      <p className="px-1 pt-3 text-xs text-[#757575]">
        Postings advertised on the careers site. A draft is <strong>Submitted for approval</strong>,
        an approver <strong>publishes</strong> it, and only <strong>published</strong> roles appear
        publicly. Closing a role keeps its applications.
      </p>

      <div className="mt-4 flex gap-1 border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={`px-3 py-2 text-xs font-semibold -mb-px border-b-2 ${
              status === t.key
                ? 'border-[#252525] text-[#252525]'
                : 'border-transparent text-[#9a9a9a] hover:text-[#555]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ResourceManager
        key={status}
        api="workspace"
        permission="workspace.recruitment"
        searchPlaceholder="Search jobs"
        endpoint="/job-postings"
        extraQuery={`status=${status}`}
        detailHref={(row) => `/dashboard/workspace/jobs/${row.id}`}
        createLabel="+ New Job"
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'department', label: 'Department' },
          { key: 'location', label: 'Location' },
          { key: 'employmentType', label: 'Type' },
          { key: 'applicationCount', label: 'Applicants' },
          { key: 'status', label: 'Status' },
        ]}
        fields={[
          { key: 'title', label: 'Title', type: 'text', required: true },
          { key: 'department', label: 'Department', type: 'text' },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'employmentType', label: 'Employment type', type: 'select', options: EMPLOYMENT_TYPES },
          { key: 'experience', label: 'Experience', type: 'text' },
          { key: 'openings', label: 'Openings', type: 'number' },
          { key: 'summary', label: 'Summary (one line)', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'responsibilities', label: 'Responsibilities', type: 'textarea' },
          { key: 'requirements', label: 'Requirements', type: 'textarea' },
          { key: 'closesAt', label: 'Closes at', type: 'date' },
        ]}
        renderRowExtra={(row, reload) => {
          const disabled = busy === row.id;
          const btn = (label, onClick, tone = '') => (
            <button
              type="button" disabled={disabled} onClick={onClick}
              className={`text-xs font-semibold hover:underline disabled:opacity-40 ${tone}`}
            >
              {label}
            </button>
          );
          return (
            <div className="flex items-center gap-3 justify-end">
              {row.status === 'draft' && canUpdate && btn('Submit for approval', () => submit(row, reload))}
              {row.status === 'pending_approval' && canApprove && (
                <>
                  {btn('Approve', () => approve(row, reload), 'text-green-700')}
                  {btn('Reject', () => reject(row, reload), 'text-red-600')}
                </>
              )}
              {row.status === 'pending_approval' && !canApprove && (
                <span className="text-[11px] text-[#9a9a9a]">Awaiting approval</span>
              )}
              {row.status === 'published' && canUpdate
                && btn('Close', () => setStatusTo(row, 'closed', 'Role closed', reload), 'text-red-600')}
              {row.status === 'closed' && canUpdate
                && btn('Reopen (draft)', () => setStatusTo(row, 'draft', 'Reopened as draft', reload))}
            </div>
          );
        }}
      />
    </div>
  );
}
