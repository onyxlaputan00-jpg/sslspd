const fs = require('fs');
const path = require('path');

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || ''
};

const outputPath = path.join(__dirname, 'public', 'env.js');
const contents = `window.__ENV__ = ${JSON.stringify(env)};\n`;

fs.writeFileSync(outputPath, contents, 'utf8');
console.log(`Generated ${outputPath}`);
