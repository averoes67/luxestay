const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const regex = /<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="nav-auth-guest">/g;

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    if (regex.test(content)) {
       console.log(file);
    }
}
