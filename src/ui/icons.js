// Fixed, local vector icon set. No emoji fonts or network icon package is needed.
// Accessible button names are supplied by the button's aria-label.
const paths={
  left:'<path d="M19 12H5m7-7-7 7 7 7"/>',
  right:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  gas:'<path d="M13 3h6l-1.5 18H7.5L10 7l3-4Z"/><path d="M11 10h6m-6.8 4h6.4m-6.9 4h6.6"/>',
  brake:'<path d="M5 7h14l2 11H3L5 7Z"/><path d="M7 11h10m-9 4h8"/>',
  camera:'<path d="M14 4H9L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-3-3Z"/><circle cx="12" cy="13" r="3.2"/>',
  fullscreen:'<path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m13-5v4a1 1 0 0 1-1 1h-4"/>',
  pause:'<rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/>',
  passenger:'<circle cx="10" cy="7" r="3"/><path d="M3 20v-2a7 7 0 0 1 14 0v2m2-8v6m-3-3h6"/>',
  car:'<path d="m5 11 1.8-5a2 2 0 0 1 1.9-1.4h6.6A2 2 0 0 1 17.2 6l1.8 5M4 11h16v7H4v-7Zm2 7v2m12-2v2"/><path d="M7 14h1m8 0h1"/>'
};
export function svgIcon(name){
  const path=paths[name];
  if(!path)throw new Error('Unknown UI icon: '+name);
  return `<svg class="ui-svg ui-svg-${name}" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}
