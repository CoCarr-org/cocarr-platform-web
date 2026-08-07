'use client';
import { ListScreen } from '@cocarr/datagrid';

// Access Requests — backed by cocarr-workspace-api.
//
// The list SHAPE (columns, fields) used to sit in navConfig.js alongside the nav
// STRUCTURE. Only the structure belonged on the server; the shape lives here,
// next to the route that renders it, which is also where anyone looks for it.
//
// `permission` is the base key — ListScreen derives Add / Edit / Delete from
// `<permission>.create|update|delete`.
export default function Page() {
  return (
    <ListScreen
      api="workspace"
      permission="workspace.accessRequests"
      title="Access Requests"
      endpoint={"/access-requests"}
      detailHref={(row) => `/dashboard/workspace/access-requests/${row.id}`}
      columns={[
        {
          "key": "employeeId",
          "label": "Employee"
        },
        {
          "key": "status",
          "label": "Status"
        },
        {
          "key": "reason",
          "label": "Reason"
        },
        {
          "key": "createdAt",
          "label": "Raised"
        }
      ]}
      fields={[]}
      note={"Additional-access requests and their decisions. Approving here records the decision; the IAM change is applied by the authorization service."}
      readOnly={true}
    />
  );
}
