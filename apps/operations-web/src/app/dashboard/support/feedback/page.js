'use client';
import { ListScreen } from '@cocarr/datagrid';

// Feedback — backed by the core API.
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
      api="core"
      permission="operations.support"
      title="Feedback"
      endpoint={"/admin/feedback"}
      columns={[
        {
          "key": "source",
          "label": "Source"
        },
        {
          "key": "totalRating",
          "label": "Rating"
        },
        {
          "key": "comment",
          "label": "Comment"
        },
        {
          "key": "createdAt",
          "label": "When"
        }
      ]}
      note={"Rider and host reviews merged into one feed."}
      readOnly={true}
    />
  );
}
