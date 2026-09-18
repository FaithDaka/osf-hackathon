/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Preact aliasing is CLIENT-ONLY: "react" -> "preact/compat",
    // "react-dom" -> "preact/compat". This keeps the shipped client bundle
    // minimal vs. full React.
    //
    // The server (SSR prerender + Next dev runtimes incl. the App Router
    // fallback) intentionally keeps real React: server modules resolve via
    // Node externals, and Next's own server code requires React 18 APIs
    // (e.g. React.cache in dedupe-fetch) that preact/compat does not
    // implement. Aliasing the server too made every unknown dev URL 500,
    // which broke HMR polling and caused infinite full-page reload loops.
    // Object form (required by Next — see invalid-resolve-alias), ordered
    // most-specific first so the automatic JSX runtime resolves before
    // the `react` prefix entry.
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react/jsx-runtime': 'preact/jsx-runtime',
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
