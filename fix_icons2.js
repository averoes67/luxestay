const fs = require('fs');

function fixIconsCSS(content) {
    // This regex looks for any CSS selector ending in ' i' just before a '{' or ','
    // and adds the equivalent ' svg' selector.
    // e.g. ".room-meta span i {" -> ".room-meta span i, .room-meta span svg {"
    
    // We only want to match selectors, so we avoid matching things inside rules by ensuring
    // we capture the selector part leading up to ' i'.
    // A simple replacement on the whole string:
    let newContent = content.replace(/([a-zA-Z0-9_\-\.\#\s>]+?)\s+i(\s*[{,])/g, (match, p1, p2) => {
        // If the match already contains 'svg', don't touch it
        if (match.includes('svg')) return match;
        // Also avoid if it's some random word ending in i (which is preceded by space, so it's a tag)
        return `${p1} i, ${p1} svg${p2}`;
    });
    
    return newContent;
}

const files = ['css/style.css', 'booking.html', 'index.html', 'rooms.html'];

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
