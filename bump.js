const fs = require('fs');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/href="css\/style\.css\?v=2"/g, 'href="css/style.css?v=3"');
    fs.writeFileSync(file, content);
}
console.log('Bumped cache version');
