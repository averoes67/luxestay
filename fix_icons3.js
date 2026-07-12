const fs = require('fs');

function fixIconsCSS(content) {
    let newContent = content.replace(/([a-zA-Z0-9_\-\.\#\s>]+?)\s+i(\s*[{,])/g, (match, p1, p2) => {
        if (match.includes('svg')) return match;
        return `${p1} i, ${p1} svg${p2}`;
    });
    return newContent;
}

const files = ['admin.html', 'dashboard.html', 'login.html'];
for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = fixIconsCSS(content);
        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            console.log('Fixed ' + file);
        }
    }
}
