import './globals.css';

export const metadata = {
  title: 'Cocarr Workspace',
  description: 'Cocarr Workspace',
};

// Root layout. Auth and navigation are NOT set up here — they belong to the
// dashboard segment, so a future sign-in route can render without waiting on
// (or being refused by) an IAM payload it does not need.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
