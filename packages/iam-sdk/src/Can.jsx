'use client';
import { useCan } from './hooks';

// Declarative gate for a chunk of UI:
//
//   <Can permission="operations.bookings.update"><EditButton/></Can>
//
// `fallback` is for the rare case where the absence needs explaining. Most of
// the time rendering nothing is right — a disabled button somebody can never
// enable is just a question they cannot answer.
export function Can({ permission, children, fallback = null }) {
  return useCan(permission) ? children : fallback;
}
