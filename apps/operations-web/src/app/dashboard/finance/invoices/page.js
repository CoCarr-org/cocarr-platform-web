'use client';
import { ListScreen } from '@cocarr/datagrid';

// Invoices — backed by the core API.
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
      permission="operations.payouts"
      title="Invoices"
      endpoint={"/admin/invoices"}
      columns={[
        {
          "key": "invoiceNumber",
          "label": "Invoice"
        },
        {
          "key": "hostId",
          "label": "Host"
        },
        {
          "key": "totalAmount",
          "label": "Amount"
        },
        {
          "key": "status",
          "label": "Status"
        },
        {
          "key": "createdAt",
          "label": "Issued"
        }
      ]}
      note={"Host invoice records generated from settlements."}
      readOnly={true}
    />
  );
}
