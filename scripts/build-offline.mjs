import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

// Convert the production Vite bundle into one portable HTML file.
// Rapier's -compat build embeds its WASM; no network or server is required.
const dist=resolve('dist');
const htmlPath=join(dist,'index.html');
let html=await readFile(htmlPath,'utf8');
const bundledScripts=[...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
const bundledStyles=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)];
if(bundledScripts.length!==1||bundledStyles.length!==1){
  throw new Error('Expected one Vite JS and CSS bundle; found '+bundledScripts.length+' JS, '+bundledStyles.length+' CSS');
}
function toAssetPath(url){
  const mark='/assets/';const index=url.indexOf(mark);
  if(index<0)throw new Error('Unexpected bundle URL: '+url);
  const file=url.slice(index+1);
  if(!/^assets\/[\w.\-]+$/.test(file))throw new Error('Unsafe bundle asset: '+file);
  return join(dist,file);
}
for(const item of bundledStyles){
  const css=await readFile(toAssetPath(item[1]),'utf8');
  html=html.replace(item[0],'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>');
}
for(const item of bundledScripts){
  const js=await readFile(toAssetPath(item[1]),'utf8');
  html=html.replace(item[0],'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
}
html=html.replace(/\s*<link\b[^>]*\brel="manifest"[^>]*>/gi,'');
const icon=await readFile('public/app-icon.svg','utf8');
html=html.replace(/\s*<link\b[^>]*\brel="icon"[^>]*>/gi,
  '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,'+Buffer.from(icon).toString('base64')+'">');
// The production bundle may contain modulepreload hints, which are not
// required once its modules are embedded inside this document.
html=html.replace(/\s*<link\b[^>]*\brel="modulepreload"[^>]*>/gi,'');
const remaining=html.match(/\b(?:src|href)="[^"]*\/assets\/[^"]+"/g);
if(remaining)throw new Error('Offline HTML still references bundle assets: '+remaining.slice(0,8).join(', '));
const output=join(dist,'Gogogo-offline.html');
await writeFile(output,html,'utf8');
console.log('Created '+output+' ('+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MiB)');
