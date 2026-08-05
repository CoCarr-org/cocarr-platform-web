import { redirect } from 'next/navigation';

// The root path has nothing of its own to show. Where a signed-in person should
// LAND depends on what they may open, which only the IAM payload knows — so the
// dashboard segment resolves it (see dashboard/page.js) rather than this
// redirect guessing at a route the caller may be refused.
export default function Home() {
  redirect('/dashboard');
}
