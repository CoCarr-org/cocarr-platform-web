'use client';
import { ListScreen } from '@cocarr/datagrid';

// Employees — backed by cocarr-workspace-api.
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
      permission="workspace.employees"
      title="Employees"
      endpoint={"/employees"}
      detailHref={(row) => `/dashboard/workspace/employees/${row.id}`}
      columns={[
        {
          "key": "employeeCode",
          "label": "Code"
        },
        {
          "key": "firstName",
          "label": "First"
        },
        {
          "key": "lastName",
          "label": "Last"
        },
        {
          "key": "email",
          "label": "Email"
        },
        {
          "key": "status",
          "label": "Status"
        },
        {
          "key": "createdAt",
          "label": "Added"
        }
      ]}
      fields={[
        {
          "key": "firstName",
          "label": "First name",
          "type": "text",
          "required": true
        },
        {
          "key": "lastName",
          "label": "Last name",
          "type": "text"
        },
        {
          "key": "email",
          "label": "Email",
          "type": "text",
          "required": true
        },
        {
          "key": "phone",
          "label": "Phone",
          "type": "text"
        },
        {
          "key": "departmentId",
          "label": "Department",
          "type": "select",
          "optionsFrom": { "api": "workspace", "endpoint": "/departments", "value": "id", "label": "name" }
        },
        {
          "key": "designationId",
          "label": "Designation",
          "type": "select",
          "optionsFrom": { "api": "workspace", "endpoint": "/designations", "value": "id", "label": "title" }
        },
        {
          "key": "teamId",
          "label": "Team",
          "type": "select",
          "optionsFrom": { "api": "workspace", "endpoint": "/teams", "value": "id", "label": "name" }
        },
        {
          "key": "managerId",
          "label": "Reports to",
          "type": "select",
          "optionsFrom": { "api": "workspace", "endpoint": "/employees", "value": "id", "label": "firstName + lastName" }
        },
        {
          "key": "dateOfJoining",
          "label": "Date of joining",
          "type": "date"
        }
      ]}
      createLabel={"+ Add Employee"}
      note={"Employee records. The EMP code and staff login are issued at onboarding approval."}
    />
  );
}
