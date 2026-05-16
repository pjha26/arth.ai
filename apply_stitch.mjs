import fs from 'fs/promises';

async function run() {
  const html = await fs.readFile('stitch.html', 'utf8');

  // 1. Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) throw new Error("No body found");
  let bodyContent = bodyMatch[1];

  // 2. Convert class to className
  bodyContent = bodyContent.replace(/class="/g, 'className="');
  
  // 3. Convert comments
  bodyContent = bodyContent.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

  // 4. Fix self-closing tags
  bodyContent = bodyContent.replace(/<img([^>]*[^\/])>/g, '<img$1 />');
  bodyContent = bodyContent.replace(/<hr([^>]*[^\/])>/g, '<hr$1 />');
  bodyContent = bodyContent.replace(/<input([^>]*[^\/])>/g, '<input$1 />');
  bodyContent = bodyContent.replace(/<br([^>]*[^\/])>/g, '<br$1 />');

  // 5. Replace 'Book a Demo' with Link to /form
  bodyContent = bodyContent.replace(/<button([^>]*)>\s*Book a Demo\s*<\/button>/g, '<Link href="/form" $1>Book a Demo</Link>');
  // The first button in the nav doesn't have a class that looks like a button, it's just 'Book a Demo'. Let's replace the hrefs.
  bodyContent = bodyContent.replace(/href="#"/g, 'href="/"');

  const pageComponent = `import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background font-body-md antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      ${bodyContent}
    </div>
  );
}
`;

  await fs.writeFile('app/page.tsx', pageComponent);
  console.log("Updated app/page.tsx");

  // 6. Extract tailwind JSON
  const configMatch = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
  if (configMatch) {
    // Parse the JS object literal
    const configStr = configMatch[1];
    const config = new Function('return ' + configStr)();

    let themeCSS = '\n@import "tailwindcss";\n\n@theme {\n';
    
    // Colors
    for (const [k, v] of Object.entries(config.theme.extend.colors || {})) {
      themeCSS += `  --color-${k}: ${v};\n`;
    }
    
    // Radii
    for (const [k, v] of Object.entries(config.theme.extend.borderRadius || {})) {
      const name = k === 'DEFAULT' ? 'radius' : `radius-${k}`;
      themeCSS += `  --${name}: ${v};\n`;
    }

    // Spacing
    for (const [k, v] of Object.entries(config.theme.extend.spacing || {})) {
      themeCSS += `  --spacing-${k}: ${v};\n`;
    }

    // FontFamily
    for (const [k, v] of Object.entries(config.theme.extend.fontFamily || {})) {
      themeCSS += `  --font-${k}: ${v.join(', ')};\n`;
    }

    // FontSize (Tailwind v4 doesn't support complex objects in fontSize variables like this, 
    // it requires defining text sizes as --text-* variables if we map them directly, but it's simpler to just output the raw CSS values)
    // Actually, Tailwind 4 parses `--text-xs: 0.75rem; --text-xs--line-height: 1rem;`
    for (const [k, v] of Object.entries(config.theme.extend.fontSize || {})) {
      const size = v[0];
      const lh = v[1]?.lineHeight;
      const ls = v[1]?.letterSpacing;
      const fw = v[1]?.fontWeight;
      
      themeCSS += `  --text-${k}: ${size};\n`;
      if (lh) themeCSS += `  --text-${k}--line-height: ${lh};\n`;
      if (ls) themeCSS += `  --text-${k}--letter-spacing: ${ls};\n`;
      if (fw) themeCSS += `  --text-${k}--font-weight: ${fw};\n`;
    }

    themeCSS += '}\n';

    // 7. Extract style block
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      themeCSS += '\n/* Stitch Styles */\n' + styleMatch[1];
    }

    // Write to globals.css
    // To not destroy the existing css, we prepend @import "tailwindcss" if missing, 
    // and append our theme.
    let globalsCSS = await fs.readFile('styles/globals.css', 'utf8');
    if (!globalsCSS.includes('@import "tailwindcss"')) {
       globalsCSS = themeCSS + '\n' + globalsCSS;
    } else {
       globalsCSS += '\n' + themeCSS;
    }
    await fs.writeFile('styles/globals.css', globalsCSS);
    console.log("Updated styles/globals.css");
  }

  // Update layout to add the fonts
  let layoutContent = await fs.readFile('app/layout.tsx', 'utf8');
  if (!layoutContent.includes('fonts.googleapis.com')) {
    layoutContent = layoutContent.replace(
      '<body>',
      `<head>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>`
    );
    await fs.writeFile('app/layout.tsx', layoutContent);
    console.log("Updated app/layout.tsx");
  }

}

run().catch(console.error);
