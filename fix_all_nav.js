const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    
    // The exact string that has 3 closing divs
    const badHTML = `</button>
            </div>
            </div>
            </div>`;
            
    const goodHTML = `</button>
          </div>`;
          
    if (content.includes('</div>\n            </div>\n            </div>')) {
       // regex to replace multiple closing divs that come right after the lang switcher buttons
       content = content.replace(/<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/, '</button>\n          </div>');
       fs.writeFileSync(file, content);
       console.log("Fixed " + file);
    }
}
