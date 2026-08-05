// Server component layout to export generateStaticParams for static export
// This is required because generateStaticParams cannot be in a client component

// Generate static params for static export
// Since this is a client-side SPA, we only need to generate the root route
// All other routes (including dynamic ones) will be handled by client-side routing
export async function generateStaticParams() {
  return [
    { slug: [] }, // Root path '/'
    { slug: ['login'] },
    { slug: ['dashboard'] },
    { slug: ['dashboard', 'rides'] },
    { slug: ['dashboard', 'vehicles'] },
    { slug: ['dashboard', 'hosts'] },
    { slug: ['dashboard', 'users'] },
    { slug: ['dashboard', 'payments'] },
    { slug: ['dashboard', 'dues'] },
    { slug: ['dashboard', 'offers'] },
    { slug: ['dashboard', 'wallet'] },
    { slug: ['dashboard', 'wallet-transaction'] },
    { slug: ['dashboard', 'membership'] },
    { slug: ['dashboard', 'availability-schedule'] },
    { slug: ['dashboard', 'settings'] },
    { slug: ['dashboard', 'settings', 'preferences'] },
    { slug: ['dashboard', 'settings', 'protection-plan'] },
    { slug: ['dashboard', 'settings', 'membership-types'] },
    { slug: ['dashboard', 'settings', 'cities'] },
    { slug: ['dashboard', 'settings', 'brands'] },
    { slug: ['dashboard', 'settings', 'pickup-points'] },
  ]
}

export default function CatchAllLayout({ children }) {
  return <>{children}</>
}

