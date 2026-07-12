const fs = require('fs');

function fixIconsCSS(content) {
    // Regex to match a CSS selector ending in ' i' followed by '{' or ','
    // It captures the part before ' i' (e.g., '.room-meta-item')
    
    // Split content by lines to make it easier for simple rules
    let lines = content.split('\n');
    let newLines = lines.map(line => {
        // e.g. ".room-meta-item i {" -> ".room-meta-item i, .room-meta-item svg {"
        // e.g. ".btn i," -> ".btn i, .btn svg,"
        
        let match = line.match(/^(\s*)(.*?)\s+i(\s*[{,])/);
        if (match) {
            let space = match[1];
            let selector = match[2];
            let ending = match[3];
            
            // Avoid matching things that already have svg right after or are complex
            if (!line.includes('svg')) {
                return `${space}${selector} i, ${selector} svg${ending}`;
            }
        }
        return line;
    });
    return newLines.join('\n');
}

const cssFiles = ['css/style.css']; // Add booking.html which also has a local <style> block
let styleContent = fs.readFileSync('css/style.css', 'utf8');
fs.writeFileSync('css/style.css', fixIconsCSS(styleContent));
console.log('Fixed css/style.css');

let bookingContent = fs.readFileSync('booking.html', 'utf8');
fs.writeFileSync('booking.html', fixIconsCSS(bookingContent));
console.log('Fixed booking.html');
