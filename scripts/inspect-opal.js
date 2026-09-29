async function checkOpal() {
  const res = await fetch('https://finai-opal.vercel.app/');
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  // Look for script tags
  const regex = /<script[^>]*src=["']([^"']+)["']/gi;
  let match;
  const scripts = [];
  while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  console.log('Scripts in HTML:', scripts);

  console.log('Has Font Awesome in HTML?', html.includes('font-awesome') || html.includes('cdnjs.cloudflare.com'));
  
  for (const s of scripts) {
    const scriptUrl = s.startsWith('http') ? s : 'https://finai-opal.vercel.app' + (s.startsWith('/') ? s : '/' + s);
    const resS = await fetch(scriptUrl);
    const sText = await resS.text();
    console.log('Script:', s, 'Status:', resS.status, 'Type:', resS.headers.get('content-type'), 'Len:', sText.length);
    if (s.includes('app.js')) {
      console.log('  app.js contains alias bridge?', sText.includes('aliasMap') || sText.includes('alias'));
    }
  }
}
checkOpal();
