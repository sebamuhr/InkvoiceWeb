// Inline SVG icons (offline, no icon-font/CDN). Stroke inherits currentColor.
const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const svg = (inner) => `<svg viewBox="0 0 24 24" ${P} aria-hidden="true">${inner}</svg>`;

export const Icon = {
  home:  svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
  plus:  svg('<path d="M12 5v14M5 12h14"/>'),
  doc:   svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  user:  svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  back:  svg('<path d="M15 18l-6-6 6-6"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  copy:  svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  edit:  svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  share: svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/>'),
  download: svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  save:  svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  search:svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  card:  svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'),
  palette:svg('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17" cy="10" r="1"/><circle cx="8" cy="7" r="1"/><circle cx="6.5" cy="11" r="1"/><path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.7-.3-1.3-.7-1.7-.4-.5-.6-1-.6-1.5a2.2 2.2 0 0 1 2.2-2.2H18a4 4 0 0 0 4-4c0-4.4-4.5-8-10-8z"/>'),
  building:svg('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>'),
  calc:  svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4"/>'),
  list:  svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  dollar:svg('<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  x:     svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  refresh: svg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>'),
};
