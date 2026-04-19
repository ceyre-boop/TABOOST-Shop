const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Read the YAML file
const yamlContent = fs.readFileSync('moduleContainer_raw.yml', 'utf8');
const data = yaml.load(yamlContent);

// Extract fileSystem
const fileSystem = data.properties.fileSystem;
const outputDir = 'react-dashboard';

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract each file
for (const [filePath, content] of Object.entries(fileSystem)) {
  const fullPath = path.join(outputDir, filePath);
  const dir = path.dirname(fullPath);
  
  // Create directory if needed
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file (content may have >- or |+ YAML markers, handle accordingly)
  let fileContent = content;
  if (typeof fileContent === 'string') {
    fs.writeFileSync(fullPath, fileContent, 'utf8');
    console.log(`Created: ${filePath}`);
  }
}

console.log('\n✅ All files extracted to react-dashboard/');
