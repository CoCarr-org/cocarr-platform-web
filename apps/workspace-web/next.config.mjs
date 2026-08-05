/** @type {import('next').NextConfig} */
// Workspace packages ship as source, so Next must compile them like app code.
// Without transpilePackages a JSX file from packages/ reaches the bundler
// untransformed and the build fails on the first tag it meets.
const nextConfig = {
  transpilePackages: [
    '@cocarr/ui', '@cocarr/layouts', '@cocarr/iam-sdk', '@cocarr/api-sdk',
    '@cocarr/auth-sdk', '@cocarr/shared-utils', '@cocarr/shared-hooks',
    '@cocarr/forms', '@cocarr/datagrid', '@cocarr/charts', '@cocarr/icons',
    '@cocarr/theme', '@cocarr/notifications',
  ],
};
export default nextConfig;
