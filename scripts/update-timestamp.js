const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const now = new Date();
const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

const updatedContent = content.replace(
    /(<span id="last-updated-timestamp">)(.*?)(<\/span>)/,
    `$1${formattedDate}$3`
);

fs.writeFileSync(indexPath, updatedContent);
console.log(`✅ index.html timestamp updated to ${formattedDate}`);
