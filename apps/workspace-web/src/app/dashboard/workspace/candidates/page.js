'use client';
import { ListScreen } from '@cocarr/datagrid';

// Candidates — backed by cocarr-workspace-api.
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
      permission="workspace.recruitment"
      title="Candidates"
      endpoint={"/candidates"}
      columns={[
        {
          "key": "firstName",
          "label": "First"
        },
        {
          "key": "email",
          "label": "Email"
        },
        {
          "key": "positionTitle",
          "label": "Position"
        },
        {
          "key": "stage",
          "label": "Stage"
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
          "key": "positionTitle",
          "label": "Position title",
          "type": "text"
        },
        {
          "key": "departmentId",
          "label": "Department ID",
          "type": "text"
        },
        {
          "key": "source",
          "label": "Source",
          "type": "text"
        },
        {
          "key": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]}
      createLabel={"+ Add Candidate"}
      note={"Hiring pipeline. Use the Hire action (API) to convert a candidate into an employee in onboarding."}
    />
  );
}
