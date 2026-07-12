const fs = require('fs');

const filesToFix = ['admin.html', 'dashboard.html', 'login.html'];
const regex = /(<button class="lang-pill-btn" id="btn-id" onclick="changeLanguage\('id'\)">ID<\/button>\s*<\/div>)\s*<\/div>\s*<\/div>/g;

for (const file of filesToFix) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (regex.test(content)) {
           content = content.replace(regex, '$1');
           fs.writeFileSync(file, content);
           console.log("Fixed " + file);
        }
    }
}
