const fs = require('fs');
const vm = require('vm');

try {
    const scriptContent = fs.readFileSync('app.js', 'utf8');
    // Check syntax
    new vm.Script(scriptContent);
    console.log('✅ UI JavaScript Syntax OK');
} catch (e) {
    console.error('❌ UI JavaScript Syntax Error:');
    console.error(e.message);
    process.exit(1);
}