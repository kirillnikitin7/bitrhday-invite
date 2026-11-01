/*
 * Конструктор открыток: всё работает в браузере, без API и сервера.
 * Добавление шаблона: объект в THEMES, option в index.html, ветка в drawBackground().
 */
'use strict';

const WIDTH = 1080;
const HEIGHT = 1350;
const canvas = document.getElementById('invitationCanvas');
const ctx = canvas.getContext('2d');
const form = document.getElementById('invitationForm');
const status = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const themeDescription = document.getElementById('theme-description');
const themeDot = document.getElementById('theme-dot');

const THEMES = {
  confetti: {
    description: 'Нежные оттенки, шарики и праздничное конфетти.',
    swatch: '#e6a0aa', ink: '#603f5b', secondary: '#86687c', accent: '#c6708b'
  },
  lavender: {
    description: 'Воздушная лаванда, цветы и немного волшебства.',
    swatch: '#a78fd7', ink: '#51416f', secondary: '#84738f', accent: '#9774bd'
  },
  sunshine: {
    description: 'Солнечные цвета, нежный персик и весёлые цветы.',
    swatch: '#f3b05e', ink: '#6b492e', secondary: '#9a7758', accent: '#e08c53'
  },
  midnight: {
    description: 'Тёмная открытка с золотыми звёздами и сиянием.',
    swatch: '#e7c77f', ink: '#fffaf0', secondary: '#d9cdae', accent: '#ebce89'
  }
};

const DEFAULTS = {
  template: 'confetti', font: 'Comfortaa', guestName: 'Александр', salutation: 'm',
  heading: 'На день рождения!', message: 'Приходи разделить со мной этот чудесный день!',
  dateText: '21 ноября 2026', timeText: '17:00',
  locationText: 'Кафе «Счастье», ул. Цветочная, 12', signature: 'До скорой встречи!'
};

const KEYS = Object.keys(DEFAULTS);
let pendingFrame = false;
let rendering = false;

function getValues() {
  const v = {};
  for (const key of KEYS) v[key] = (form.elements.namedItem(key)?.value ?? DEFAULTS[key]);
  if (!THEMES[v.template]) v.template = DEFAULTS.template;
  if (!['Comfortaa', 'Andika', 'Lato', 'Carlito', 'Inter'].includes(v.font)) v.font = DEFAULTS.font;
  return v;
}
function safeText(value) { return String(value ?? '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function showStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#be515e' : '#8b72a6';
}
function setThemeDescription(name) {
  const t = THEMES[name] || THEMES.confetti;
  themeDescription.textContent = t.description;
  themeDot.style.background = t.swatch;
}
function scheduleRender() {
  if (pendingFrame) return;
  pendingFrame = true;
  requestAnimationFrame(() => {
    pendingFrame = false;
    render();
  });
}

// Без случайных результатов: каждый раз рисунок одинаковый, включая скачанный PNG.
function seededRandom(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
}
function fillLinear(c1, c2) {
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, HEIGHT);
}
function roundedPath(x, y, w, h, r) {
  const a = Math.min(r, w / 2, h / 2);
  ctx.beginPath();ctx.moveTo(x + a, y);ctx.arcTo(x + w, y, x + w, y + h, a);
  ctx.arcTo(x + w, y + h, x, y + h, a);ctx.arcTo(x, y + h, x, y, a);
  ctx.arcTo(x, y, x + w, y, a);ctx.closePath();
}
function panel(x, y, w, h, radius, fill, stroke = null, lineWidth = 1) {
  roundedPath(x, y, w, h, radius); ctx.fillStyle = fill;ctx.fill();
  if (stroke) {ctx.lineWidth = lineWidth;ctx.strokeStyle = stroke;ctx.stroke();}
}
function dot(x, y, radius, color, alpha = 1) {
  ctx.save();ctx.globalAlpha = alpha;ctx.beginPath();ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;ctx.fill();ctx.restore();
}
function ellipse(x, y, rx, ry, color, rotation = 0, alpha = 1) {
  ctx.save();ctx.globalAlpha = alpha;ctx.translate(x, y);ctx.rotate(rotation);ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);ctx.fillStyle = color;ctx.fill();ctx.restore();
}
function pathStroke(points, color, width = 3, alpha = 1) {
  ctx.save();ctx.globalAlpha = alpha;ctx.lineWidth = width;ctx.lineCap = 'round';
  ctx.lineJoin = 'round';ctx.strokeStyle = color;ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();ctx.restore();
}
function star(x, y, ro, ri, color, n = 5, rotation = -Math.PI / 2, alpha = 1) {
  ctx.save();ctx.globalAlpha = alpha;ctx.translate(x, y);ctx.rotate(rotation);ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = Math.PI * i / n;
    if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.closePath();ctx.fillStyle = color;ctx.fill();ctx.restore();
}
function twinkle(x, y, r, color, opacity = 1) {
  ctx.save();ctx.globalAlpha = opacity;ctx.translate(x, y);ctx.beginPath();ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * .18, -r * .18, r, 0);ctx.quadraticCurveTo(r * .18, r * .18, 0, r);
  ctx.quadraticCurveTo(-r * .18, r * .18, -r, 0);ctx.quadraticCurveTo(-r * .18, -r * .18, 0, -r);
  ctx.fillStyle = color;ctx.fill();ctx.restore();
}
function flower(x, y, r, petal, middle, count = 6, rotation = 0) {
  ctx.save();ctx.translate(x, y);ctx.rotate(rotation);
  for (let i = 0; i < count; i++) {
    const a = 2 * Math.PI * i / count;
    ellipse(Math.cos(a) * r * .66, Math.sin(a) * r * .66, r * .43, r * .68, petal, a + Math.PI / 2);
  }
  dot(0, 0, r * .38, middle);
  ctx.restore();
}
function balloon(x, y, w, h, color, tieColor, sway = 0) {
  ctx.save();ctx.translate(x, y);ctx.rotate(sway);
  ctx.strokeStyle = tieColor;ctx.lineWidth = 2.4;ctx.lineCap = 'round';
  ctx.beginPath();ctx.moveTo(0, h * .89);ctx.bezierCurveTo(-31, h * 1.53, 23, h * 1.82, -15, h * 2.22);ctx.stroke();
  ellipse(0, 0, w / 2, h / 2, color);
  ctx.beginPath();ctx.moveTo(-9, h * .44);ctx.lineTo(0, h * .58);ctx.lineTo(9, h * .44);ctx.fillStyle = color;ctx.fill();
  ctx.beginPath();ctx.ellipse(-w * .18, -h * .2, w * .08, h * .21, -.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.55)';ctx.fill();ctx.restore();
}
function pattern(seed, palette, quantity, excluded = null) {
  const rnd = seededRandom(seed);
  for (let i = 0; i < quantity; i++) {
    const x = 32 + rnd() * 1016, y = 32 + rnd() * 1286;
    if (excluded && x > excluded.x && x < excluded.x + excluded.w && y > excluded.y && y < excluded.y + excluded.h) continue;
    const c = palette[Math.floor(rnd() * palette.length)];
    if (rnd() > .64) star(x, y, 4 + rnd() * 7, 2, c, 4, rnd() * Math.PI, .65);
    else if (rnd() > .50) dot(x, y, 2.3 + rnd() * 4, c, .57);
    else { ctx.save();ctx.translate(x, y);ctx.rotate(rnd() * Math.PI * 2);ctx.fillStyle = c;ctx.globalAlpha = .65;ctx.fillRect(-5, -2.8, 10 + rnd() * 10, 5.6);ctx.restore(); }
  }
}
function drawConfetti() {
  fillLinear('#fff6ed', '#ffe9ee');
  ellipse(-80, 45, 350, 260, '#ffdfca', -.2, .68);
  ellipse(1020, 120, 260, 260, '#f4c8d6', -.35, .55);
  ellipse(30, 1310, 310, 200, '#f7c7d5', .2, .66);
  ellipse(1020, 1310, 290, 240, '#f8d9bb', -.3, .63);
  pattern(1618, ['#db92a3', '#d7ae69', '#98b5a4', '#ac99c9'], 155, { x: 126, y: 388, w: 828, h: 795 });
  balloon(160, 215, 100, 135, '#d5a3ca', '#b984a0', -.17);
  balloon(292, 175, 86, 125, '#f4c47c', '#cfab78', .15);
  balloon(910, 185, 102, 139, '#90bdb1', '#93a99d', .15);
  balloon(798, 245, 84, 126, '#f8a9a4', '#c99b9b', -.17);
  star(540, 155, 25, 12, '#e6ac9e', 5);twinkle(520, 225, 10, '#bd98b3');twinkle(585, 206, 8, '#c69b8c');
  panel(101, 364, 878, 860, 49, 'rgba(255,253,249,.91)', 'rgba(215,173,180,.58)', 2);
  panel(119, 381, 842, 826, 35, 'rgba(255,255,255,0)', 'rgba(222,183,191,.29)', 2);
  flower(139, 1238, 23, '#ebb2bb', '#eec37f', 6, .2);
  flower(938, 1264, 27, '#e6aac1', '#f1c67e', 7, -.3);
  dot(189, 1287, 8, '#c9a1bc');dot(870, 1266, 8, '#aab7a5');
}
function drawLavender() {
  fillLinear('#eee4ff', '#d3bfe7');
  ellipse(-70, 120, 370, 330, '#f9f0ff', .4, .6);
  ellipse(1110, 1120, 400, 330, '#c5a7df', .3, .52);
  ellipse(930, 160, 330, 250, '#e2ccef', -.35, .6);
  pattern(5432, ['#aa8ccd', '#fef4ff', '#a8a3d6', '#e4c2ec'], 158, { x: 115, y: 370, w: 850, h: 808 });
  ctx.strokeStyle = '#b79cda';ctx.lineWidth = 2.4;ctx.beginPath();ctx.moveTo(36, 317);ctx.bezierCurveTo(225, 55, 390, 190, 540, 79);ctx.stroke();
  ctx.beginPath();ctx.moveTo(1046, 293);ctx.bezierCurveTo(840, 75, 733, 210, 615, 76);ctx.stroke();
  flower(538, 173, 69, '#e6d2f2', '#f3e5a1', 7, .4);
  flower(188, 262, 49, '#f9e9ff', '#dfc384', 7, .1);
  flower(910, 245, 48, '#d0b3e6', '#f8eab2', 6, .9);
  flower(95, 1182, 78, '#d4b2eb', '#e5ca8c', 7, .2);
  flower(963, 1223, 81, '#e6c5ee', '#e9c899', 7, -.3);
  panel(100, 360, 880, 870, 47, 'rgba(255,252,255,.86)', 'rgba(255,255,255,.86)', 4);
  panel(123, 383, 834, 824, 32, 'rgba(255,255,255,0)', 'rgba(172,141,201,.26)', 2);
  twinkle(540, 320, 13, '#ac88d0');twinkle(329, 133, 10, '#fffafc');twinkle(793, 106, 14, '#fffafc');
}
function drawSunshine() {
  fillLinear('#fff4d2', '#ffddd0');
  ellipse(1080, 180, 340, 360, '#ffdfae', -.2, .63);
  ellipse(-40, 1130, 340, 350, '#ffbdba', .1, .42);
  ellipse(100, 40, 250, 220, '#fff9db', .7, .8);
  const rnd = seededRandom(481);for (let i = 0; i < 88; i++) {
    const x = rnd() * WIDTH, y = rnd() * HEIGHT;
    if (x > 120 && x < 960 && y > 385 && y < 1198) continue;
    twinkle(x, y, 4 + rnd() * 7, rnd() > .5 ? '#e2a174' : '#f0c47f', .65);
  }
  ctx.save();ctx.translate(540, 160);
  for (let i = 0; i < 14; i++) {
    ctx.rotate(Math.PI * 2 / 14);
    panel(-5, -134, 10, 35, 5, '#efa953');
  }
  ellipse(0, 0, 87, 87, '#f5b85e');ellipse(-21, -20, 18, 12, '#ffdca2', -.4, .7);ctx.restore();
  flower(200, 222, 47, '#ffc49e', '#e9a553', 7, .5);
  flower(869, 275, 43, '#ffd7af', '#ecaf56', 6, -.1);
  flower(75, 1177, 78, '#ffce9b', '#f2aa58', 7, .4);
  flower(985, 1261, 69, '#ffbda6', '#f0b56d', 7, .7);
  panel(101, 361, 878, 866, 45, 'rgba(255,253,245,.90)', 'rgba(239,170,110,.48)', 3);
  panel(123, 382, 834, 825, 29, 'rgba(255,255,255,0)', 'rgba(241,188,128,.3)', 2);
  pathStroke([[163,1320],[255,1300],[354,1318],[435,1298],[528,1322],[630,1304],[760,1322],[895,1297]], '#ecad7c', 8, .55);
  star(120, 315, 15, 7, '#e8aa63');star(964, 342, 16, 9, '#e8aa63');
}
function firework(x, y, radius, color, count = 12) {
  ctx.save();ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const a = 2 * Math.PI * i / count;
    ctx.beginPath();ctx.moveTo(x + Math.cos(a) * radius * .49, y + Math.sin(a) * radius * .49);
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    ctx.strokeStyle = color;ctx.lineWidth = 4;ctx.globalAlpha = .72;ctx.stroke();
    dot(x + Math.cos(a) * radius * 1.15, y + Math.sin(a) * radius * 1.15, 3.4, color, .8);
  }
  ctx.restore();
}
function drawMidnight() {
  fillLinear('#272644', '#413157');
  ellipse(530, 40, 480, 370, '#635577', 0, .35);
  ellipse(0, 1330, 350, 260, '#695177', 0, .3);
  const rnd = seededRandom(8006);
  for (let i = 0; i < 160; i++) {
    const x = 26 + rnd() * 1026, y = 30 + rnd() * 1290;
    if (x > 135 && x < 945 && y > 400 && y < 1190) continue;
    if (rnd() > .76) twinkle(x, y, 5 + rnd() * 10, '#f9df9f', .45 + rnd() * .35);
    else dot(x, y, 1.3 + rnd() * 2.5, '#f7dfaf', .18 + rnd() * .55);
  }
  firework(190, 195, 78, '#f4d38c', 11);firework(884, 242, 82, '#c4a8de', 14);
  firework(546, 171, 101, '#f6deab', 16);
  panel(76, 337, 928, 913, 51, 'rgba(31,28,58,.65)', 'rgba(231,200,130,.63)', 4);
  panel(99, 361, 882, 865, 36, 'rgba(59,52,86,.42)', 'rgba(228,195,133,.26)', 2);
  star(538, 316, 15, 7, '#e5c77f');twinkle(150, 1278, 26, '#f0d191', .88);
  twinkle(946, 1294, 21, '#e9c985', .75);
  pathStroke([[202,1306],[305,1290],[400,1310],[500,1292],[606,1313],[718,1294],[832,1310]], '#d7b979', 2, .45);
}
function drawBackground(theme) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  switch (theme) {
    case 'lavender': drawLavender();break;
    case 'sunshine': drawSunshine();break;
    case 'midnight': drawMidnight();break;
    default:drawConfetti();
  }
}

function buildGreeting(v) {
  const name = safeText(v.guestName);
  if (v.salutation === 'none') return name ? (/[!.?]$/.test(name) ? name : name + '!') : 'Для тебя!';
  const male = v.salutation !== 'f';
  const label = male ? 'Дорогой' : 'Дорогая';
  return `${label} ${name || (male ? 'гость' : 'гостья')}!`;
}
function setCanvasFont(family, weight, size) {
  ctx.font = `${weight} ${size}px "${family}", Arial, sans-serif`;
}
function splitLongWord(word, width) {
  const parts = [];let cur = '';
  for (const ch of Array.from(word)) {
    if (cur && ctx.measureText(cur + ch).width > width) {parts.push(cur);cur = ch;}
    else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}
function wrapText(input, maxWidth) {
  const inputLines = String(input ?? '').replace(/\r/g, '').split('\n');
  const out = [];
  for (const originalLine of inputLines) {
    const line = originalLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const words = line.split(' ').flatMap(word => (ctx.measureText(word).width > maxWidth ? splitLongWord(word, maxWidth) : [word]));
    let current = '';
    for (const word of words) {
      const next = current ? current + ' ' + word : word;
      if (current && ctx.measureText(next).width > maxWidth) {out.push(current);current = word;}
      else current = next;
    }
    if (current) out.push(current);
  }
  return out;
}
function layoutContent(v, scale) {
  const availableWidth = 778;
  const blocks = [
    {type: 'text', text:'ПРИГЛАШЕНИЕ', size:28, weight:700, color:'secondary', gap:27, letterSpacing:2},
    {type: 'text', text:buildGreeting(v), size:61, weight:700, color:'ink', gap:27},
    {type: 'text', text:safeText(v.heading), size:55, weight:700, color:'accent', gap:23},
    {type: 'text', text:safeText(v.message), size:36, weight:400, color:'ink', gap:24},
    {type: 'divider', gap:24},
    {type: 'text', text:safeText(v.dateText), size:48, weight:700, color:'ink', gap:12},
    {type: 'text', text:safeText(v.timeText), size:39, weight:400, color:'accent', gap:19},
    {type: 'text', text:safeText(v.locationText), size:34, weight:400, color:'secondary', gap:21},
    {type: 'text', text:safeText(v.signature), size:31, weight:700, color:'ink', gap:0}
  ];
  const active = blocks.filter(b => b.type === 'divider' || b.text);
  // Если дата, время и место скрыты, разделительная линия тоже не нужна.
  if (![v.dateText, v.timeText, v.locationText].some(x => safeText(x))) {
    const i = active.findIndex(b => b.type === 'divider');if (i >= 0) active.splice(i, 1);
  }
  let total = 0;
  for (const b of active) {
    b.scaledGap = b.gap * scale;
    if (b.type === 'divider') b.height = 18 * scale;
    else {
      b.scaledSize = b.size * scale;
      b.height = b.scaledSize * 1.3;
      setCanvasFont(v.font, b.weight, b.scaledSize);
      b.lines = wrapText(b.text, availableWidth);
      b.height *= b.lines.length;
    }
    total += b.height + b.scaledGap;
  }
  return {blocks: active, total};
}
function drawContent(v) {
  const theme = THEMES[v.template];
  const regionTop = 410, regionBottom = 1193;
  const available = regionBottom - regionTop;
  let scale = 1;
  let layout = layoutContent(v, scale);
  while (layout.total > available && scale > .48) {
    scale = Math.max(.48, scale - .02);
    layout = layoutContent(v, scale);
  }
  // В редких случаях очень длинного текста используем дополнительную подгонку.
  if (layout.total > available) {
    scale *= available / layout.total;
    layout = layoutContent(v, scale);
  }
  let y = regionTop + Math.max(0, (available - layout.total) / 2);
  ctx.textAlign = 'center';ctx.textBaseline = 'middle';
  for (const b of layout.blocks) {
    if (b.type === 'divider') {
      const mid = y + b.height / 2;
      pathStroke([[423, mid],[513, mid]], theme.accent, 2, .45);
      pathStroke([[567, mid],[657, mid]], theme.accent, 2, .45);
      star(540, mid, 10 * scale, 5 * scale, theme.accent, 4);
    } else {
      setCanvasFont(v.font, b.weight, b.scaledSize);
      ctx.fillStyle = theme[b.color];
      for (let i = 0; i < b.lines.length; i++) {
        const line = b.lines[i];
        ctx.fillText(line, WIDTH / 2, y + b.scaledSize * 1.3 * (i + .5));
      }
    }
    y += b.height + b.scaledGap;
  }
}
function render() {
  if (!ctx || rendering) return;
  rendering = true;
  try {
    const v = getValues();
    drawBackground(v.template);
    drawContent(v);
    setThemeDescription(v.template);
  } catch (error) {console.error('Не удалось создать открытку:', error);showStatus('Ошибка предпросмотра. Попробуйте обновить страницу.', true);}
  finally {rendering = false;}
}
async function ensureFont(family) {
  if (!document.fonts || !document.fonts.load) return;
  await Promise.all([document.fonts.load(`400 40px "${family}"`), document.fonts.load(`700 50px "${family}"`)]);
}
async function getBlob() {
  const v = getValues();
  await ensureFont(v.font);
  render();
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas не удалось преобразовать в PNG')), 'image/png'));
}
function filename() {
  const name = safeText(getValues().guestName).replace(/[^\p{L}\p{N}\-_]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'guest';
  return `Приглашение-${name}.png`;
}
function makeBlobUrl(blob) {
  const url = URL.createObjectURL(blob);
  // Не очищать слишком рано: Safari может ещё считывать файл.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return url;
}

form.addEventListener('submit', e => e.preventDefault());
form.addEventListener('input', scheduleRender);
form.addEventListener('change', () => {
  scheduleRender();
  ensureFont(getValues().font).then(scheduleRender).catch(() => showStatus('Не удалось загрузить шрифт.', true));
});

document.getElementById('previewJump').addEventListener('click', () => {
  document.getElementById('preview-title').scrollIntoView({behavior:'smooth', block:'start'});
});

document.getElementById('resetBtn').addEventListener('click', () => {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const element = form.elements.namedItem(key);
    if (element) element.value = value;
  }
  scheduleRender();showStatus('Настройки возвращены к примеру.');
});

downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  try {
    const blob = await getBlob();
    const url = makeBlobUrl(blob);
    const a = document.createElement('a');a.href = url;a.download = filename();
    document.body.appendChild(a);a.click();a.remove();
    showStatus('PNG готов! Если файл не скачался, нажмите «Открыть картинку».');
  } catch (error) {console.error(error);showStatus('Не удалось сохранить PNG. Попробуйте открыть картинку.', true);}
  finally {downloadBtn.disabled = false;}
});

document.getElementById('openBtn').addEventListener('click', async () => {
  // Открываем вкладку непосредственно по нажатию, иначе мобильный браузер может её блокировать.
  const tab = window.open('', '_blank');
  if (!tab) {showStatus('Браузер заблокировал вкладку. Разрешите открытие всплывающих окон.', true);return;}
  try {
    tab.document.title = 'Готовая открытка';
    tab.document.body.style.cssText = 'margin:0;display:grid;place-items:center;min-height:100vh;background:#f3f0f7';
    tab.document.body.textContent = 'Создаём открытку…';
    const blob = await getBlob();
    tab.location.replace(makeBlobUrl(blob));
    showStatus('Картинка открыта в новой вкладке. На телефоне удерживайте её, чтобы сохранить.');
  } catch (error) {console.error(error);tab.close();showStatus('Не удалось открыть картинку.', true);}
});

if (navigator.share && navigator.canShare && typeof File !== 'undefined') {
  const sample = new File(['x'], 'test.png', {type:'image/png'});
  if (navigator.canShare({files: [sample]})) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      try {
        const blob = await getBlob();
        const file = new File([blob], filename(), {type:'image/png'});
        await navigator.share({files:[file], title:'Приглашение на день рождения'});
        showStatus('Открытка готова к отправке!');
      } catch (error) {
        if (error?.name !== 'AbortError') {console.error(error);showStatus('Не получилось поделиться. Скачайте PNG.', true);}
      }
    });
  }
}

render();
ensureFont(DEFAULTS.font).then(scheduleRender).catch(() => {});
if (document.fonts) document.fonts.ready.then(scheduleRender).catch(() => {});
