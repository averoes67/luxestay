const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');
css += `
/* ── Custom Language Switcher ── */
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10, 14, 26, 0.6);
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
}
.lang-switcher select {
  background: transparent;
  border: none;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  appearance: none;
  font-family: 'Inter', sans-serif;
  padding-right: 16px;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23D4A853%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 10px;
}
.lang-switcher select option {
  background: var(--bg-primary);
  color: var(--text-primary);
}
`;
fs.writeFileSync('css/style.css', css);
