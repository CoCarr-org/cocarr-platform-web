'use client';
import { ListScreen } from '@cocarr/datagrid';

// Departments — backed by cocarr-workspace-api.
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
      title="Departments"
      endpoint={"/departments"}
      columns={[
        {
          "key": "name",
          "label": "Name"
        },
        {
          "key": "code",
          "label": "Code"
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
          "key": "code",
          "label": "Code",
          "type": "text"
        },
        {
          "key": "description",
          "label": "Description",
          "type": "textarea"
        },
        {
          "key": "parentDepartmentId",
          "label": "Parent department ID",
          "type": "text"
        },
        {
          "key": "isActive",
          "label": "Active",
          "type": "boolean"
        }
      ]}
      createLabel={"+ Add Department"}
    />
  );
}
