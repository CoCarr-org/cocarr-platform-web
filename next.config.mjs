/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Forward legacy CRA-style env vars to the browser. Next.js only exposes
    // NEXT_PUBLIC_* by default, but ~40 files still read REACT_APP_BASE_URL /
    // REACT_APP_UPLOAD_URL, so map them here (inlined at build time).
    env: {
        REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL,
        REACT_APP_UPLOAD_URL: process.env.REACT_APP_UPLOAD_URL,
    },
};

export default nextConfig;
