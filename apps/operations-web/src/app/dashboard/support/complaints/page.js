'use client';
import { ListScreen } from '@cocarr/datagrid';

// Complaints — backed by the core API.
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
      permission="operations.bookings"
      title="Complaints"
      endpoint={"/admin/disputes"}
      columns={[
        {
          "key": "bookingId",
          "label": "Booking"
        },
        {
          "key": "category",
          "label": "Category"
        },
        {
          "key": "status",
          "label": "Status"
        },
        {
          "key": "amountClaimed",
          "label": "Claimed"
        },
        {
          "key": "createdAt",
          "label": "Raised"
        }
      ]}
      fields={[
        {
          "key": "bookingId",
          "label": "Booking ID",
          "type": "text",
          "required": true
        },
        {
          "key": "category",
          "label": "Category",
          "type": "text"
        },
        {
          "key": "description",
          "label": "Description",
          "type": "textarea"
        },
        {
          "key": "amountClaimed",
          "label": "Amount claimed",
          "type": "number"
        },
        {
          "key": "amountAwarded",
          "label": "Amount awarded",
          "type": "number"
        },
        {
          "key": "status",
          "label": "Status",
          "type": "select",
          "options": [
            {
              "value": "open",
              "name": "Open"
            },
            {
              "value": "investigating",
              "name": "Investigating"
            },
            {
              "value": "resolved",
              "name": "Resolved"
            },
            {
              "value": "rejected",
              "name": "Rejected"
            }
          ]
        },
        {
          "key": "resolution",
          "label": "Resolution",
          "type": "textarea"
        }
      ]}
      createLabel={"+ Log Complaint"}
      note={"Booking-linked complaints and disputes, with a monetary outcome. General queries belong in Support Tickets."}
    />
  );
}
