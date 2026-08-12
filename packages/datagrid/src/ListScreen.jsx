'use client';
import { PageLayout } from '@cocarr/ui';
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
    // Same skeleton as every other screen: navigation header, then the data.
    // ResourceManager brings its own search/pagination row, so this passes no
    // `filters` — the band would otherwise be an empty grey stripe.
    <PageLayout title={title} subtitle={note}>
      <ResourceManager
        api={api}
        permission={permission}
        searchPlaceholder={`Search ${String(title).toLowerCase()}`}
        {...list}
      />
    </PageLayout>
  );
}
