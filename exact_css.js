const fs = require('fs');

let css = fs.readFileSync('css/style.css', 'utf8');

const newCss = `
/* ── Custom Language Switcher ── */
.lang-switcher-pill {
  display: inline-flex;
  align-items: center;
  background: #f1f3f5; /* Light grey background */
  border-radius: 12px; /* Slightly rounded corners */
  padding: 4px;
  gap: 4px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05); /* Very subtle inner border */
}
.lang-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px 0 8px;
  color: #000; /* Black icon */
}
.lang-pill-btn {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  color: #666; /* Dark grey text for inactive */
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px; /* Inner button radius */
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  outline: none;
}
.lang-pill-btn:hover {
  color: #000;
}
.lang-pill-btn.active {
  background: #ffffff; /* White background for active */
  color: #000; /* Black text for active */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); /* Shadow to make it pop */
}
`;

const oldCssStart = css.indexOf('/* ── Custom Language Switcher ── */');
if (oldCssStart !== -1) {
    css = css.substring(0, oldCssStart) + newCss;
    fs.writeFileSync('css/style.css', css);
    console.log('CSS replaced');
} else {
    console.log('CSS block not found');
}
