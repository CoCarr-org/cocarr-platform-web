'use client';
import { ListScreen } from '@cocarr/datagrid';

// Designations — backed by cocarr-workspace-api.
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
      title="Designations"
      endpoint={"/designations"}
      columns={[
        {
          "key": "title",
          "label": "Title"
        },
        {
          "key": "level",
          "label": "Level"
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
          "key": "title",
          "label": "Title",
          "type": "text",
          "required": true
        },
        {
          "key": "level",
          "label": "Level (lower = senior)",
          "type": "number"
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
      createLabel={"+ Add Designation"}
    />
  );
}
