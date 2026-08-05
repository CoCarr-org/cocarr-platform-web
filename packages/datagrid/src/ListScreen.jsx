'use client';
import { Header } from '@cocarr/ui';
import ResourceManager from './ResourceManager';

// A whole CRUD screen: page chrome + the resource table.
//
// This is the old catch-all router's `ListPage`, lifted out. That component
// existed because one file rendered every list route; now each route has its own
// file, and what they share is this — so a screen is a config, not a copy of the
// same twenty lines of layout.
//
// `note` renders above the table for the screens that need a sentence of
// context ("general queries belong in Support Tickets"), exactly as before.
export default function ListScreen({
  title,
  note,
  permission,
  api = 'core',
  ...list
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <Header title={title} RightContent={() => null} />
      {note && <p className="px-1 pt-3 text-xs text-[#757575]">{note}</p>}
      <ResourceManager
        api={api}
        permission={permission}
        searchPlaceholder={`Search ${String(title).toLowerCase()}`}
        {...list}
      />
    </div>
  );
}
