const fs = require('fs');
const path = require('path');

// Function to copy directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Try different possible Cesium source paths
const possiblePaths = [
  path.join(__dirname, '../node_modules/cesium/Build/Cesium'),
  path.join(__dirname, '../node_modules/cesium/Build/CesiumUnminified'),
  path.join(__dirname, '../node_modules/cesium/Source'),
];

let cesiumSource = null;

for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    cesiumSource = possiblePath;
    console.log(`Found Cesium at: ${possiblePath}`);
    break;
  }
}

if (!cesiumSource) {
  console.warn('Warning: Cesium source directory not found. Skipping copy.');
  console.warn('This is expected if running without node_modules installed.');
  process.exit(0);
}

const publicDest = path.join(__dirname, '../public/cesium');

// Copy required Cesium directories
const directories = ['Workers', 'ThirdParty', 'Assets', 'Widgets'];

console.log('Copying Cesium files to public directory...');

let copiedCount = 0;

directories.forEach(dir => {
  const src = path.join(cesiumSource, dir);
  const dest = path.join(publicDest, dir);

  if (fs.existsSync(src)) {
    console.log(`Copying ${dir}...`);
    copyDir(src, dest);
    copiedCount++;
  } else {
    console.log(`Skipping ${dir} (not found at ${src})`);
  }
});

if (copiedCount > 0) {
  console.log(`Successfully copied ${copiedCount} Cesium directories!`);
} else {
  console.warn('No Cesium directories were copied. Please check the Cesium package installation.');
}
