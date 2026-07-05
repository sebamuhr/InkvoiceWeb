import { getProfile, getCardColor, saveCardColor } from '../store.js';
import { esc, toast } from '../util.js';
import { Icon } from '../icons.js';

// Background palette — same gradient the Android app's slider uses.
const PALETTE = [
  '#FFFFFF','#F8F9FA','#F1F3F4','#E8EAED','#DADCE0','#BDC1C6','#9AA0A6','#5F6368','#3C4043','#202124','#000000',
  '#1A237E','#283593','#3F51B5','#3949AB','#5C6BC0','#7986CB','#9FA8DA','#E8EAF6',
  '#1976D2','#1E88E5','#42A5F5','#64B5F6','#90CAF9','#BBDEFB','#E3F2FD',
  '#00796B','#26A69A','#4DB6AC','#80CBC4','#B2DFDB','#E0F2F1',
  '#388E3C','#66BB6A','#81C784','#A5D6A7','#C8E6C9','#E8F5E8',
  '#F57C00','#FF9800','#FFB74D','#FFCC02','#FFF176','#FFF59D','#FFFDE7',
  '#D32F2F','#E57373','#EF9A9A','#FFCDD2','#FFEBEE',
  '#7B1FA2','#9C27B0','#BA68C8','#CE93D8','#E1BEE7','#F3E5F5',
];
const COLOR_KEY = 'inkvoice_card_color';

const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n>>16 & 255, n>>8 & 255, n & 255]; };
function lerpHex(a, b, t){
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i]-v)*t));
  return '#' + c.map(v => v.toString(16).padStart(2,'0')).join('');
}
function colorAt(pos){ // pos 0..1 across the palette
  const x = pos * (PALETTE.length - 1);
  const i = Math.min(Math.floor(x), PALETTE.length - 2);
  return lerpHex(PALETTE[i], PALETTE[i+1], x - i);
}
// WCAG relative luminance → choose black vs white text like Android's luminance()>0.5.
function isLight(hex){
  const [r,g,b] = hexToRgb(hex).map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
  return 0.2126*r + 0.7152*g + 0.0722*b > 0.5;
}

let bgColor = '#FFFFFF';

export function html(){
  const p = getProfile();
  if(!p.businessName){
    return `<div class="screen"><div class="empty">${Icon.bizcard}<div>Set up your business profile first.</div>
      <button class="btn" style="margin-top:14px" onclick="nav('/profile')">Go to Profile</button></div></div>`;
  }
  bgColor = getCardColor();

  const lines = [p.ownerName, p.email, p.phone, p.website].filter(Boolean)
    .map(l => `<div class="bc-line">${esc(l)}</div>`).join('');
  const gradient = `linear-gradient(90deg, ${PALETTE.join(',')})`;

  return `<div class="screen">
    <div class="topbar"><h1>Business Card</h1></div>
    <div class="bizcard" id="card">
      <div class="bc-logo">${p.logoUri ? `<img src="${esc(p.logoUri)}" alt="">` : `<div class="c"></div>`}</div>
      <div class="bc-info">
        <div class="bc-name">${esc(p.businessName)}</div>
        ${lines}
      </div>
    </div>

    <div class="card-color">
      <div class="cc-label">Background color</div>
      <input type="range" id="cc-slider" class="cc-slider" min="0" max="1000" value="0"
        style="background:${gradient}">
    </div>

    <button class="btn block" id="share" style="margin-top:16px">${Icon.share} Share Card</button>
  </div>`;
}

export function mount(){
  const p = getProfile();
  const card = document.getElementById('card');
  if(!card) return;

  const applyColor = (hex) => {
    bgColor = hex;
    const light = isLight(hex);
    card.style.background = hex;
    card.style.borderColor = light ? '#cccccc' : '#444444';
    card.style.color = light ? '#1c1b1f' : '#ffffff';
    card.querySelectorAll('.bc-line').forEach(el => el.style.color = light ? '#333333' : '#e9e9ee');
    localStorage.setItem(COLOR_KEY, hex);
  };

  // Put the slider handle where the saved colour sits in the palette.
  const slider = document.getElementById('cc-slider');
  slider.value = String(Math.round(nearestPos(bgColor) * 1000));
  slider.addEventListener('input', e => applyColor(colorAt(e.target.value / 1000)));
  // Persist + sync only the final colour (not every drag frame).
  slider.addEventListener('change', e => saveCardColor(colorAt(e.target.value / 1000)));
  applyColor(bgColor);

  document.getElementById('share').addEventListener('click', () => shareCard(p, bgColor));
}

function nearestPos(hex){
  const [r,g,b] = hexToRgb(hex);
  let best = 0, bestD = Infinity;
  PALETTE.forEach((c, i) => {
    const [cr,cg,cb] = hexToRgb(c);
    const d = Math.abs(cr-r) + Math.abs(cg-g) + Math.abs(cb-b);
    if(d < bestD){ bestD = d; best = i; }
  });
  return best / (PALETTE.length - 1);
}

// ---- draw the card to a PNG and share it (mirrors captureBusinessCardAsBitmap) ----
async function shareCard(p, hex){
  try{
    const blob = await drawCardPng(p, hex);
    const name = (p.businessName || p.ownerName || 'card').replace(/\s+/g,'-');
    const file = new File([blob], `${name}-card.png`, { type:'image/png' });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title: p.businessName || 'Business Card' });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Card saved as PNG');
    }
  }catch(e){ /* user cancelled or share unavailable */ }
}

function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function loadImage(src){
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

async function drawCardPng(p, hex){
  const W = 1000, H = 650, R = 30, LOGO = 300;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const light = isLight(hex);
  const textColor = light ? '#000000' : '#ffffff';

  // background + border
  roundRectPath(ctx, 4, 4, W-8, H-8, R);
  ctx.fillStyle = hex; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = light ? '#cccccc' : '#444444'; ctx.stroke();

  const fields = [p.businessName, p.ownerName, p.email, p.phone, p.website].filter(Boolean);
  const sizeFor = i => i===0 ? 38 : i===1 ? 28 : 24;
  const font = (i) => `${i===0 ? '700' : '400'} ${sizeFor(i)}px Roboto, Arial, sans-serif`;

  const logo = p.logoUri ? await loadImage(p.logoUri) : null;

  // widest text line → centre the logo+text group horizontally like Android
  let textW = 0;
  fields.forEach((t, i) => { ctx.font = font(i); textW = Math.max(textW, ctx.measureText(t).width); });

  const marginX = logo ? Math.max((W - LOGO - textW) / 3, 30) : 0;
  const totalTextH = fields.reduce((a,_,i)=>a+sizeFor(i),0) + (fields.length-1)*5;
  const groupH = Math.max(logo ? LOGO : 0, totalTextH);
  const groupTop = (H - groupH) / 2;

  // logo (cover-fit into the 300×300 box, rounded corners)
  if(logo){
    const lx = marginX, ly = groupTop;
    const scale = Math.max(LOGO/logo.width, LOGO/logo.height);
    const dw = logo.width*scale, dh = logo.height*scale;
    ctx.save(); roundRectPath(ctx, lx, ly, LOGO, LOGO, 16); ctx.clip();
    ctx.drawImage(logo, lx + (LOGO-dw)/2, ly + (LOGO-dh)/2, dw, dh);
    ctx.restore();
  }

  // text block
  const infoX = logo ? marginX + LOGO + marginX : W/2;
  ctx.textAlign = logo ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = textColor;
  let y = groupTop + (groupH - totalTextH) / 2;
  fields.forEach((t, i) => {
    ctx.font = font(i);
    y += sizeFor(i);
    ctx.fillText(t, infoX, y);
    y += 5;
  });

  return await new Promise(res => canvas.toBlob(res, 'image/png'));
}
