/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
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

      // Copy Cesium static assets
      const CopyWebpackPlugin = require('copy-webpack-plugin');
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'node_modules/cesium/Build/Cesium/Workers',
              to: '../public/cesium/Workers',
            },
            {
              from: 'node_modules/cesium/Build/Cesium/ThirdParty',
              to: '../public/cesium/ThirdParty',
            },
            {
              from: 'node_modules/cesium/Build/Cesium/Assets',
              to: '../public/cesium/Assets',
            },
            {
              from: 'node_modules/cesium/Build/Cesium/Widgets',
              to: '../public/cesium/Widgets',
            },
          ],
        })
      );

      // Set Cesium base URL
      config.plugins.push(
        new (require('webpack')).DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify('/cesium'),
        })
      );
    }
   
    return config;
  },
};

module.exports = nextConfig;