const fs = require('fs');
const cheerio = require('cheerio');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let dictEn = {};
let dictJa = {};

// Hardcoded translations for simplicity, or we will just prefix with "[JA]" for now
// and I will translate them manually later.
let counter = 1;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const elements = $('h1, h2, h3, p, a, button, label, span, th, td');
  
  elements.each((i, el) => {
    const text = $(el).text().trim();
    // Skip empty, numbers, or very short strings like icons
    if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) return;
    // Skip if it contains mustache or template literals
    if (text.includes('${') || text.includes('}')) return;
    
    // Create a key
    let key = text.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 30);
    if (key.endsWith('_')) key = key.slice(0, -1);
    if (!key) key = 'txt_' + counter;
    
    // Check if duplicate key but different text
    if (dictEn[key] && dictEn[key] !== text) {
        key = key + '_' + counter;
    }
    
    dictEn[key] = text;
    $(el).attr('data-i18n', key);
    counter++;
  });

  // Inject script and language switcher if not present
  const switcherHtml = `
        <div class="lang-switcher">
          <i data-lucide="globe" style="width:14px;height:14px;color:var(--text-secondary);"></i>
          <select id="langSwitcher" onchange="changeLanguage(this.value)">
            <option value="en">EN</option>
            <option value="ja">JA</option>
          </select>
        </div>
`;
  if (!$('.lang-switcher').length) {
    $('.nav-actions').prepend(switcherHtml);
  }
  
  if (!$('script[src="js/i18n.js"]').length) {
    $('body').append('<script src="js/i18n.js"></script>\n');
  }

  fs.writeFileSync(file, $.html());
  console.log('Processed ' + file);
}

fs.writeFileSync('dict_en.json', JSON.stringify(dictEn, null, 2));
console.log('Done extracting to dict_en.json');
