const fs = require('fs');
const path = require('path');

function htmlToJsx(html) {
  return html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/viewbox/g, 'viewBox')
    .replace(/stroke-width/g, 'strokeWidth')
    .replace(/stroke-linecap/g, 'strokeLinecap')
    .replace(/stroke-linejoin/g, 'strokeLinejoin')
    .replace(/stroke-dasharray/g, 'strokeDasharray')
    .replace(/fill-rule/g, 'fillRule')
    .replace(/clip-rule/g, 'clipRule')
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/<img([^>]*)>/g, '<img$1 />')
    .replace(/<input([^>]*)>/g, '<input$1 />')
    .replace(/<br([^>]*)>/g, '<br />')
    .replace(/<hr([^>]*)>/g, '<hr />')
    // Fix inline styles manually or just remove if they are simple
    .replace(/style="([^"]*)"/g, (match, style) => {
        let jsxStyle = style.split(';').filter(Boolean).map(s => {
            let [key, val] = s.split(':');
            if(!key || !val) return '';
            key = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            return `"${key}": "${val.trim()}"`;
        }).join(', ');
        return `style={{${jsxStyle}}}`;
    });
}

const html1044 = fs.readFileSync('C:\\Users\\andre\\.gemini\\antigravity-ide\\brain\\7eabef06-f510-4e29-9fc0-a9edfc0c4541\\.system_generated\\steps\\1044\\content.md', 'utf8');
const html1045 = fs.readFileSync('C:\\Users\\andre\\.gemini\\antigravity-ide\\brain\\7eabef06-f510-4e29-9fc0-a9edfc0c4541\\.system_generated\\steps\\1045\\content.md', 'utf8');

const main1044 = html1044.match(/<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">[\s\S]*<\/footer>/) || html1044.match(/<header class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">[\s\S]*<\/footer>/);
const main1045 = html1045.match(/<header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">[\s\S]*<\/div>\s*<\/div>\s*<\/div>/) || html1045.match(/<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">[\s\S]*<\/div>\s*<\/div>\s*<\/div>/);

const jsx1044 = htmlToJsx(main1044[0]);
const jsx1045 = htmlToJsx(main1045[0]);

const dashboardComponent = `import React from 'react';

export const DashboardView = () => {
  return (
    <div className="flex flex-col w-full px-8 py-6 max-w-[1600px] mx-auto gap-10">
      ${jsx1044}
    </div>
  );
};
`;

const stockComponent = `import React from 'react';

export const StockView = () => {
  return (
    <div className="flex flex-col w-full px-8 py-6 max-w-[1540px] mx-auto gap-8">
      ${jsx1045}
    </div>
  );
};
`;

fs.mkdirSync(path.join(__dirname, 'components'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'components/DashboardView.tsx'), dashboardComponent);
fs.writeFileSync(path.join(__dirname, 'components/StockView.tsx'), stockComponent);

console.log("Components created");
