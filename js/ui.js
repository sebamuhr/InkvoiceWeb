// Material-3 style outlined field helper
import { esc } from './util.js';
import { Icon } from './icons.js';

// Outlined select with a floating label (label always floated for selects)
export function mselect(o){
  const opts = (o.options||[]).map(v => `<option ${o.value===v?'selected':''}>${esc(v)}</option>`).join('');
  return `<div class="mfield ${o.onCard?'on-card':''}">
    <select id="${o.id}" class="ctrl">${opts}</select>
    <label for="${o.id}">${o.label}</label>
    <span class="icon-r">${Icon.chev}</span>
  </div>`;
}

// opts: {label,id,value,type,required,textarea,rows,prefix,iconRight,counter,onCard,attrs,list}
export function mfield(o){
  const val = o.value ?? '';
  const cls = ['mfield', o.onCard?'on-card':'', o.prefix?'has-prefix':''].filter(Boolean).join(' ');
  // control comes BEFORE label so CSS `+ label` can float it up
  const label = `<label for="${o.id}">${o.label}${o.required?' <span class="req">*</span>':''}</label>`;
  const prefix = o.prefix ? `<span class="prefix">${o.prefix}</span>` : '';
  const iconR = o.iconRight ? `<span class="icon-r">${o.iconRight}</span>` : '';
  const attrs = o.attrs || '';
  const listAttr = o.list ? `list="${o.list}"` : '';
  const inner = o.textarea
    ? `<textarea id="${o.id}" class="ctrl" rows="${o.rows||3}" placeholder=" " ${attrs}>${esc(val)}</textarea>`
    : `<input id="${o.id}" class="ctrl" type="${o.type||'text'}" value="${esc(val)}" placeholder=" " ${listAttr} ${attrs}>`;
  const counter = o.counter
    ? `<div class="counter" data-counter-for="${o.id}" data-max="${o.counter}">${String(val).length} / ${o.counter} characters</div>`
    : '';
  return `<div class="${cls}">${inner}${label}${prefix}${iconR}</div>${counter}`;
}
