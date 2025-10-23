/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Output standalone for better Heroku compatibility
  output: 'standalone',

  // Configure webpack
  webpack: (config, { isServer, webpack }) => {
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };

    // Cesium configuration - only for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Handle Cesium's WebAssembly files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });

      // Set Cesium base URL
      config.plugins.push(
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify('/cesium'),
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;