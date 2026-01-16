const fs = require('fs');
const vm = require('vm');

try {
    const html = fs.readFileSync('index.html', 'utf8');
    // Simple extraction: finds the last <script> block which contains our logic
    // This avoids CDN scripts which are <script src="...">
    const parts = html.split('<script>');
    const lastScript = parts[parts.length - 1]; 
    
    if (!lastScript.includes('</script>')) {
        throw new Error("Could not find closing </script> tag");
    }

    const scriptContent = lastScript.split('</script>')[0];
    
    // Check syntax
    new vm.Script(scriptContent);
    console.log('✅ UI JavaScript Syntax OK');
} catch (e) {
    console.error('❌ UI JavaScript Syntax Error:');
    console.error(e.message);
    process.exit(1);
}