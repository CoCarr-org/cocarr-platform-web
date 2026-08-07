'use client';
import { ListScreen } from '@cocarr/datagrid';

// Teams — backed by cocarr-workspace-api.
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
      permission="workspace.orgStructure"
      title="Teams"
      endpoint={"/teams"}
      detailHref={(row) => `/dashboard/workspace/teams/${row.id}`}
      columns={[
        {
          "key": "name",
          "label": "Name"
        },
        {
          "key": "departmentId",
          "label": "Department"
        },
        {
          "key": "isActive",
          "label": "Active"
        },
        {
          "key": "createdAt",
          "label": "Created"
        }
      ]}
      fields={[
        {
          "key": "name",
          "label": "Name",
          "type": "text",
          "required": true
        },
        {
          "key": "departmentId",
          "label": "Department",
          "type": "select",
          "optionsFrom": { "api": "workspace", "endpoint": "/departments", "value": "id", "label": "name" }
        },
        {
          "key": "leadEmployeeId",
          "label": "Lead (employee ID)",
          "type": "text"
        },
        {
          "key": "description",
          "label": "Description",
          "type": "textarea"
        },
        {
          "key": "isActive",
          "label": "Active",
          "type": "boolean"
        }
      ]}
      createLabel={"+ Add Team"}
    />
  );
}
