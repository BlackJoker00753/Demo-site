// Процедурные текстуры: циферблаты, вставки безеля, гравировка ротора, экраны.
// Всё рисуется в Canvas 2D и превращается в THREE.CanvasTexture.

import * as THREE from "three";

const TAU = Math.PI * 2;
const DISPLAY = '"Cormorant Garamond", Georgia, serif';
const SANS = '"Onest", "Helvetica Neue", Arial, sans-serif';

// ------------------------------------------------------------------ color helpers

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = ([r, g, b], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export function shade(hex, k) {
  // k > 0 осветлить, k < 0 затемнить
  const c = hexToRgb(hex);
  return c.map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)));
}
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

function makeCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(canvas, { color = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function noise(ctx, w, h, amount = 0.05, size = 1) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4 * size) {
    const n = (Math.random() - 0.5) * 255 * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ dial finishes

function paintFinish(ctx, dial, w, h) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
  const base = dial.color;
  const c0 = hexToRgb(base);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  switch (dial.finish) {
    case "sunburst": {
      // «Солнечные лучи»: сектора света от конического градиента + тонкие радиальные штрихи.
      const g = ctx.createConicGradient(-Math.PI / 3, cx, cy);
      const light = rgb(shade(base, 0.32)), dark = rgb(shade(base, -0.35)), mid = rgb(c0);
      [[0, light], [0.12, mid], [0.25, dark], [0.38, mid], [0.5, light], [0.62, mid], [0.75, dark], [0.88, mid], [1, light]].forEach(([s, c]) => g.addColorStop(s, c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 1400; i++) {
        const a = Math.random() * TAU;
        ctx.strokeStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.02, Math.sin(a) * R * 0.02);
        ctx.lineTo(Math.cos(a) * R * 1.5, Math.sin(a) * R * 1.5);
        ctx.stroke();
      }
      ctx.restore();
      const v = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "fume": {
      const g = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.02);
      g.addColorStop(0, rgb(shade(base, 0.25)));
      g.addColorStop(0.55, base);
      g.addColorStop(1, dial.color2 ?? rgb(shade(base, -0.8)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "lacquer":
    case "enamel": {
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R * 1.1);
      g.addColorStop(0, rgb(shade(base, dial.finish === "enamel" ? 0.1 : 0.06)));
      g.addColorStop(1, rgb(shade(base, -0.12)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "tapisserie":
    case "clous":
    case "waffle": {
      // «Гобелен» Royal Oak / «гвозди» / соты: регулярная сетка с объёмной подсветкой.
      const step = R * (dial.finish === "clous" ? 0.045 : 0.07);
      if (dial.finish === "waffle") {
        const hr = step * 0.62;
        for (let row = -1, y = 0; y < h + step; row++, y = row * hr * 1.5) {
          for (let col = -1; col * hr * Math.sqrt(3) < w + step; col++) {
            const x = col * hr * Math.sqrt(3) + (row % 2 ? (hr * Math.sqrt(3)) / 2 : 0);
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * TAU + Math.PI / 6;
              ctx.lineTo(x + Math.cos(a) * hr * 0.92, y + Math.sin(a) * hr * 0.92);
            }
            ctx.closePath();
            const g = ctx.createLinearGradient(x - hr, y - hr, x + hr, y + hr);
            g.addColorStop(0, rgb(shade(base, 0.12)));
            g.addColorStop(1, rgb(shade(base, -0.12)));
            ctx.fillStyle = g;
            ctx.fill();
          }
        }
        break;
      }
      for (let y = 0; y < h + step; y += step) {
        for (let x = 0; x < w + step; x += step) {
          const s = step * 0.84;
          const x0 = x + (step - s) / 2, y0 = y + (step - s) / 2;
          ctx.fillStyle = rgb(shade(base, 0.16));
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + s, y0); ctx.lineTo(x0 + s / 2, y0 + s / 2); ctx.fill();
          ctx.fillStyle = rgb(shade(base, -0.22));
          ctx.beginPath(); ctx.moveTo(x0, y0 + s); ctx.lineTo(x0 + s, y0 + s); ctx.lineTo(x0 + s / 2, y0 + s / 2); ctx.fill();
          ctx.fillStyle = rgb(shade(base, 0.04));
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + s); ctx.lineTo(x0 + s / 2, y0 + s / 2); ctx.fill();
          ctx.fillStyle = rgb(shade(base, -0.1));
          ctx.beginPath(); ctx.moveTo(x0 + s, y0); ctx.lineTo(x0 + s, y0 + s); ctx.lineTo(x0 + s / 2, y0 + s / 2); ctx.fill();
        }
      }
      break;
    }
    case "stripes": {
      // горизонтальные рельефные полосы (Nautilus)
      const step = R * 0.055;
      for (let y = 0; y < h; y += step) {
        const g = ctx.createLinearGradient(0, y, 0, y + step);
        g.addColorStop(0, rgb(shade(base, 0.18)));
        g.addColorStop(0.5, base);
        g.addColorStop(1, rgb(shade(base, -0.28)));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, w, step);
      }
      break;
    }
    case "guilloche":
    case "wave": {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineWidth = R * 0.004;
      if (dial.finish === "wave") {
        for (let y = -R; y < R; y += R * 0.045) {
          ctx.strokeStyle = rgb(shade(base, 0.14), 0.7);
          ctx.beginPath();
          for (let x = -R; x <= R; x += 4) ctx.lineTo(x, y + Math.sin(x / (R * 0.07)) * R * 0.018);
          ctx.stroke();
        }
      } else {
        for (let r = R * 0.02; r < R; r += R * 0.012) {
          ctx.strokeStyle = rgb(shade(base, (r / R) % 0.024 > 0.012 ? 0.12 : -0.1), 0.8);
          ctx.beginPath();
          for (let a = 0; a <= TAU + 0.01; a += 0.02) {
            const rr = r + Math.sin(a * 24) * R * 0.006;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }
    case "snowflake":
    case "grained":
    case "textured":
    case "linen":
    case "ice":
    case "meteorite":
    case "mother_of_pearl": {
      if (dial.finish === "mother_of_pearl") {
        const g = ctx.createLinearGradient(0, 0, w, h);
        ["#f6f1f4", "#dfe9f2", "#f3eadf", "#e6f0ea", "#f6f1f4"].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      if (dial.finish === "linen") {
        ctx.globalAlpha = 0.12;
        for (let i = 0; i < w; i += 3) {
          ctx.fillStyle = i % 6 ? "#000" : "#fff";
          ctx.fillRect(i, 0, 1, h);
          ctx.fillRect(0, i, w, 1);
        }
        ctx.globalAlpha = 1;
      }
      if (dial.finish === "meteorite") {
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 260; i++) {
          const a = [0.3, 1.35, 2.4][i % 3];
          const x = Math.random() * w, y = Math.random() * h, len = R * (0.1 + Math.random() * 0.5);
          ctx.strokeStyle = Math.random() > 0.5 ? "#fff" : "#222";
          ctx.lineWidth = 1 + Math.random() * 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (dial.finish === "snowflake") {
        // Grand Seiko «Снежинка»: мелкие хлопья с направленным светом.
        for (let i = 0; i < 26000; i++) {
          const x = Math.random() * w, y = Math.random() * h;
          const l = 0.1 + Math.random() * 0.3;
          ctx.fillStyle = rgb(shade(base, Math.random() > 0.5 ? l : -l * 0.7), 0.6);
          ctx.beginPath();
          ctx.ellipse(x, y, 1 + Math.random() * 3, 0.6 + Math.random() * 1.2, Math.random() * TAU, 0, TAU);
          ctx.fill();
        }
      }
      noise(ctx, w, h, dial.finish === "snowflake" ? 0.05 : dial.finish === "grained" ? 0.08 : 0.04);
      const v = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R * 1.05);
      v.addColorStop(0, "rgba(255,255,255,0.06)");
      v.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "sector": {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = rgb(shade(base, -0.08));
      ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.fill();
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(hexToRgb(dial.text_color), 0.5);
      ctx.lineWidth = R * 0.004;
      [0.4, 0.62, 0.8].forEach((r) => { ctx.beginPath(); ctx.arc(0, 0, R * r, 0, TAU); ctx.stroke(); });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4);
        ctx.lineTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
        ctx.stroke();
      }
      ctx.restore();
      noise(ctx, w, h, 0.03);
      break;
    }
    case "carbon": {
      for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = (x / 16 + y / 16) % 2 ? "#18191b" : "#0f1011";
        ctx.fillRect(x, y, 16, 16);
      }
      break;
    }
    default: {
      // matte
      noise(ctx, w, h, 0.035);
      const v = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.05);
      v.addColorStop(0, "rgba(255,255,255,0.03)");
      v.addColorStop(1, "rgba(0,0,0,0.16)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

// ------------------------------------------------------------------ dial printing

const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function polar(cx, cy, r, i, n = 12) {
  const a = (i / n) * TAU - Math.PI / 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/** Позиции подциферблатов и окон, которые нельзя перекрывать надписями и индексами. */
function occupied(spec) {
  const occ = new Set((spec.subdials ?? []).map((s) => String(s.pos)));
  if (spec.date === "3" || spec.date === "day_date") occ.add("3");
  if (spec.date === "6" || spec.moonphase === "6") occ.add("6");
  if (spec.moonphase === "12" || spec.date === "big_12" || spec.date === "day_date" || spec.date === "12") occ.add("12");
  return occ;
}

function drawTrack(ctx, dial, cx, cy, R, kind) {
  const col = hexToRgb(dial.text_color);
  ctx.save();
  ctx.strokeStyle = rgb(col, 0.75);
  ctx.fillStyle = rgb(col, 0.8);
  if (kind === "railway") {
    ctx.lineWidth = R * 0.004;
    [0.93, 0.975].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, TAU); ctx.stroke(); });
  }
  for (let i = 0; i < 60; i++) {
    const five = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, R * 0.975, i, 60);
    const [x2, y2] = polar(cx, cy, R * (kind === "railway" ? 0.93 : five ? 0.935 : 0.955), i, 60);
    ctx.lineWidth = R * (five ? 0.008 : 0.004);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (kind === "railway") {
      for (let k = 1; k < 5 && i < 60; k++) {
        const [a1, b1] = polar(cx, cy, R * 0.975, i + k / 5, 60);
        const [a2, b2] = polar(cx, cy, R * 0.955, i + k / 5, 60);
        ctx.lineWidth = R * 0.002;
        ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawNumerals(ctx, spec, cx, cy, R, occ) {
  const dial = spec.dial;
  const kind = dial.indices;
  const col = dial.text_color;
  ctx.save();
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hourPos = (i) => (i === 0 ? "12" : String(i));
  for (let i = 0; i < 12; i++) {
    const h = i === 0 ? 12 : i;
    if (occ.has(hourPos(i))) continue;
    let text = null, font = null, r = 0.76;
    if (kind === "arabic" || kind === "applied_arabic") { text = String(h); font = `500 ${R * 0.17}px ${SANS}`; }
    else if (kind === "breguet") { text = String(h); font = `italic 400 ${R * 0.18}px ${DISPLAY}`; }
    else if (kind === "roman") { text = ROMAN[i]; font = `500 ${R * 0.14}px ${DISPLAY}`; r = 0.74; }
    else if (kind === "california") { text = i >= 3 && i <= 9 ? String(h) : ROMAN[i]; font = `600 ${R * 0.15}px ${DISPLAY}`; }
    else if ((kind === "explorer") && [3, 6, 9].includes(i)) { text = String(h); font = `600 ${R * 0.19}px ${SANS}`; r = 0.74; }
    else if (kind === "mixed" && [0, 3, 9].includes(i)) { text = String(h); font = `500 ${R * 0.16}px ${SANS}`; }
    else if (kind === "railway" && i % 3 === 0) { text = String(h); font = `500 ${R * 0.13}px ${SANS}`; r = 0.78; }
    if (!text) continue;
    const [x, y] = polar(cx, cy, R * r, i);
    ctx.font = font;
    if (kind === "roman") {
      // римские цифры повёрнуты к центру
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((i / 12) * TAU);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else ctx.fillText(text, x, y);
  }
  if (kind === "sticks" || kind === "sector") {
    ctx.strokeStyle = col;
    for (let i = 0; i < 12; i++) {
      if (occ.has(hourPos(i))) continue;
      const [x1, y1] = polar(cx, cy, R * 0.9, i);
      const [x2, y2] = polar(cx, cy, R * (i % 3 === 0 ? 0.72 : 0.78), i);
      ctx.lineWidth = R * (i % 3 === 0 ? 0.018 : 0.012);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSubdial(ctx, sd, spec, cx, cy, R) {
  const dial = spec.dial;
  const offs = { 3: [0.5, 0], 6: [0, 0.5], 9: [-0.5, 0], 12: [0, -0.5] }[sd.pos];
  const x = cx + offs[0] * R, y = cy + offs[1] * R;
  const r = R * (sd.kind === "moonphase" ? 0.24 : 0.25);
  const base = sd.color ?? dial.color;
  const textCol = luminance(base) > 0.5 ? "#1a1c1f" : "#e9ecef";
  ctx.save();
  // фон с азюрированием (концентрические канавки)
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  for (let k = r; k > 2; k -= r * 0.035) {
    ctx.strokeStyle = rgb(shade(base, (k / r) % 0.07 > 0.035 ? 0.12 : -0.1), 0.6);
    ctx.lineWidth = r * 0.012;
    ctx.beginPath(); ctx.arc(x, y, k, 0, TAU); ctx.stroke();
  }
  ctx.strokeStyle = rgb(shade(base, 0.35), 0.9);
  ctx.lineWidth = r * 0.03;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();

  ctx.fillStyle = textCol;
  ctx.strokeStyle = textCol;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ticks = { chrono_min: 30, chrono_hr: 12, small_seconds: 60, chrono_sec: 60, gmt_24: 24, power_reserve: 10, day: 7, date: 31, month: 12, week: 52, leap_year: 4 }[sd.kind] ?? 12;
  if (sd.kind === "moonphase") {
    drawMoonAperture(ctx, x, y, r * 0.9, spec);
  } else if (sd.kind === "tourbillon") {
    ctx.fillStyle = "#050505";
    ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, TAU); ctx.fill();
  } else {
    const labels = {
      chrono_min: [10, 20, 30], chrono_hr: [3, 6, 9, 12], small_seconds: [15, 30, 45, 60], chrono_sec: [15, 30, 45, 60],
      gmt_24: [6, 12, 18, 24], power_reserve: [0, 5, 10], date: [10, 20, 31],
    }[sd.kind] ?? [];
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * TAU - Math.PI / 2;
      const major = labels.includes(i === 0 ? ticks : i * (sd.kind === "power_reserve" ? 1 : 1)) || (ticks === 60 && i % 5 === 0) || ticks <= 12;
      ctx.lineWidth = r * (major ? 0.03 : 0.015);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
      ctx.lineTo(x + Math.cos(a) * r * (major ? 0.74 : 0.82), y + Math.sin(a) * r * (major ? 0.74 : 0.82));
      ctx.stroke();
    }
    ctx.font = `500 ${r * 0.24}px ${SANS}`;
    for (const v of labels) {
      const a = ((v % ticks) / ticks) * TAU - Math.PI / 2;
      ctx.fillText(String(v), x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
    }
  }
  ctx.restore();
}

/** Текущая фаза Луны: 0 = новолуние, 0.5 = полнолуние. */
export function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - known) / 86400000;
  return (((days / synodic) % 1) + 1) % 1;
}

function drawMoonAperture(ctx, x, y, r, spec) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r, r * 0.62, 0, Math.PI, 0);
  ctx.closePath();
  ctx.clip();
  const sky = ctx.createLinearGradient(x, y - r, x, y + r);
  sky.addColorStop(0, "#0e1f4d");
  sky.addColorStop(1, "#081230");
  ctx.fillStyle = sky;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(230,210,150,${0.4 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x + (Math.random() - 0.5) * r * 1.8, y - Math.random() * r * 0.6, 0.5 + Math.random() * 1.6, 0, TAU);
    ctx.fill();
  }
  const phase = moonPhase();
  const mx = x + (phase - 0.5) * r * 1.6;
  const mr = r * 0.34;
  const g = ctx.createRadialGradient(mx - mr * 0.3, y - mr * 0.3, mr * 0.1, mx, y, mr);
  g.addColorStop(0, "#fbe7a8");
  g.addColorStop(1, "#c79a45");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(mx, y, mr, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawDateWindow(ctx, cx, cy, R, pos, dial, day = new Date()) {
  const [x, y] = pos === "6" ? [cx, cy + R * 0.6] : pos === "12" ? [cx, cy - R * 0.6] : pos === "4_30" ? polar(cx, cy, R * 0.62, 4.5) : [cx + R * 0.64, cy];
  const w = R * 0.19, h = R * 0.15;
  ctx.save();
  ctx.fillStyle = luminance(dial.color) < 0.35 ? "#f4f3ef" : "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = R * 0.006;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, R * 0.012);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = `600 ${R * 0.12}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(day.getDate()), x, y + R * 0.006);
  ctx.restore();
  return { x, y, w, h };
}

function drawDayWindow(ctx, cx, cy, R, dial) {
  ctx.save();
  ctx.fillStyle = "#f4f3ef";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = R * 0.006;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.74, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36);
  ctx.arc(cx, cy, R * 0.6, -Math.PI / 2 + 0.36, -Math.PI / 2 - 0.36, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.font = `600 ${R * 0.075}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const word = DAYS[new Date().getDay()];
  // текст по дуге
  const r = R * 0.67;
  const total = word.length * R * 0.058;
  let a = -Math.PI / 2 - total / r / 2;
  for (const ch of word) {
    const cw = R * 0.058;
    a += cw / r / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += cw / r / 2;
  }
  ctx.restore();
}

/**
 * Текстура циферблата. Для круглых: квадрат size×size, радиус = size/2.
 * Для прямоугольных: size × size*aspect.
 */
export function paintDial(spec, { size = 1024, aspect = 1, rect = false } = {}) {
  const w = size, h = Math.round(size * aspect);
  const [canvas, ctx] = makeCanvas(w, h);
  const dial = spec.dial;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
  paintFinish(ctx, dial, w, h);

  if (dial.finish === "screen" || dial.finish === "lcd") {
    paintScreen(ctx, w, h, dial);
    return toTexture(canvas);
  }

  const occ = occupied(spec);
  if (dial.track !== "none") drawTrack(ctx, dial, cx, cy, R, dial.track === "railway" || dial.indices === "railway" ? "railway" : "minutes");
  drawNumerals(ctx, spec, cx, cy, R, occ);
  for (const sd of spec.subdials ?? []) drawSubdial(ctx, sd, spec, cx, cy, R);
  if (spec.moonphase === "6" || spec.moonphase === "12") {
    const y = spec.moonphase === "6" ? cy + R * 0.48 : cy - R * 0.44;
    drawMoonAperture(ctx, cx, y, R * 0.24, spec);
  }
  if (["3", "6", "12", "4_30", "day_date"].includes(spec.date)) drawDateWindow(ctx, cx, cy, R, spec.date === "day_date" ? "3" : spec.date, dial);
  if (spec.date === "day_date") drawDayWindow(ctx, cx, cy, R, dial);
  if (spec.date === "big_12") {
    ctx.fillStyle = "#f4f3ef";
    const d = String(new Date().getDate()).padStart(2, "0");
    [[-1, d[0]], [1, d[1]]].forEach(([s, ch]) => {
      ctx.fillStyle = "#f4f3ef";
      ctx.fillRect(cx + s * R * 0.1 - R * 0.085, cy - R * 0.56, R * 0.17, R * 0.2);
      ctx.fillStyle = "#111";
      ctx.font = `600 ${R * 0.15}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, cx + s * R * 0.1, cy - R * 0.46);
    });
  }

  // Надписи: марка под «12», коллекция над «6».
  ctx.save();
  ctx.fillStyle = dial.text_color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (spec.logo) {
    const top = occ.has("12");
    ctx.font = `600 ${R * (spec.logo.length > 10 ? 0.07 : 0.09)}px ${DISPLAY}`;
    ctx.letterSpacing = `${R * 0.012}px`;
    ctx.fillText(spec.logo.toUpperCase(), cx, cy - R * (top ? 0.22 : 0.42));
  }
  if (spec.caption) {
    ctx.font = `500 ${R * 0.05}px ${SANS}`;
    ctx.letterSpacing = `${R * 0.01}px`;
    ctx.globalAlpha = 0.85;
    const capY = occ.has("6") ? (occ.has("12") ? cy + R * 0.02 : cy - R * 0.29) : cy + R * 0.4;
    ctx.fillText(spec.caption.toUpperCase(), cx, capY);
  }
  ctx.restore();

  if (dial.finish === "skeleton") {
    // Скелетон: вырезаем центр, оставляем кольцо с разметкой.
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.7, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  return toTexture(canvas);
}

function paintScreen(ctx, w, h, dial) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (dial.finish === "lcd") {
    ctx.fillStyle = "#9aa596";
    ctx.fillRect(w * 0.12, h * 0.28, w * 0.76, h * 0.44);
    ctx.fillStyle = "#1c211b";
    ctx.font = `500 ${h * 0.26}px "JetBrains Mono", monospace`;
    ctx.fillText(`${hh}:${mm}`, w / 2, h / 2 + h * 0.02);
    ctx.font = `500 ${h * 0.06}px ${SANS}`;
    ctx.fillStyle = dial.text_color;
    ctx.fillText("SHOCK RESIST", w / 2, h * 0.8);
    return;
  }
  // OLED-экран смарт-часов: чёрный фон, крупное время, кольца активности.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f5f5f5";
  ctx.font = `300 ${h * 0.26}px ${SANS}`;
  ctx.fillText(`${hh}:${mm}`, w / 2, h * 0.36);
  const rings = [["#ff3b5c", 0.8], ["#a6ff4d", 0.62], ["#3fd3ff", 0.5]];
  rings.forEach(([c, p], i) => {
    const r = h * (0.16 - i * 0.035);
    ctx.lineWidth = h * 0.028;
    ctx.lineCap = "round";
    ctx.strokeStyle = c + "33";
    ctx.beginPath(); ctx.arc(w / 2, h * 0.72, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = c;
    ctx.beginPath(); ctx.arc(w / 2, h * 0.72, r, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
  });
}

// ------------------------------------------------------------------ bezel inserts

/**
 * Вставка безеля для RingGeometry (планарная UV-развёртка: центр холста = ось часов).
 * inner/outer заданы как доли радиуса холста.
 */
export function paintBezelInsert(type, { color = "#0c0d10", color2 = null, textColor = null, inner = 0.78, size = 1024 } = {}) {
  const [canvas, ctx] = makeCanvas(size);
  const c = size / 2, R = size / 2;
  const tc = textColor ?? (luminance(color) > 0.55 ? "#15171a" : "#e9ecef");
  const rIn = R * inner, rOut = R, mid = (rIn + rOut) / 2, band = rOut - rIn;

  // фон кольца
  if (type === "gmt" && color2) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(c, c, R, Math.PI, 0); ctx.lineTo(c + rIn, c); ctx.arc(c, c, rIn, 0, Math.PI, true); ctx.fill();
    ctx.fillStyle = color2;
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI); ctx.lineTo(c - rIn, c); ctx.arc(c, c, rIn, Math.PI, 0, true); ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.arc(c, c, rIn, 0, TAU, true); ctx.fill();
  }
  // лёгкий блеск керамики
  const sheen = ctx.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0, "rgba(255,255,255,0.08)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = sheen;
  ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.arc(c, c, rIn, 0, TAU, true); ctx.fill();

  ctx.fillStyle = tc;
  ctx.strokeStyle = tc;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = (str, angle, r = mid, fs = band * 0.46) => {
    ctx.save();
    ctx.translate(c + Math.cos(angle) * r, c + Math.sin(angle) * r);
    ctx.rotate(angle + Math.PI / 2);
    ctx.font = `500 ${fs}px ${SANS}`;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  };
  const tick = (angle, from, to, width) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * from, c + Math.sin(angle) * from);
    ctx.lineTo(c + Math.cos(angle) * to, c + Math.sin(angle) * to);
    ctx.stroke();
  };
  const ang = (frac) => frac * TAU - Math.PI / 2;
  const triangle = (angle) => {
    ctx.save();
    ctx.translate(c + Math.cos(angle) * mid, c + Math.sin(angle) * mid);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, band * 0.3);
    ctx.lineTo(-band * 0.3, -band * 0.25);
    ctx.lineTo(band * 0.3, -band * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  if (type === "dive" || type === "countdown") {
    for (let m = 0; m < 60; m++) {
      const a = ang(m / 60);
      if (m === 0) { triangle(a); continue; }
      if (m % 10 === 0) text(String(type === "countdown" ? 60 - m : m), a);
      else if (m % 5 === 0) tick(a, rIn + band * 0.18, rOut - band * 0.18, band * 0.09);
      else if (m < 15) tick(a, rIn + band * 0.45, rOut - band * 0.15, band * 0.035);
    }
  } else if (type === "gmt") {
    for (let hr = 0; hr < 24; hr++) {
      const a = ang(hr / 24);
      if (hr === 0) { triangle(a); continue; }
      if (hr % 2 === 0) text(String(hr), a, mid, band * 0.44);
      else tick(a, rIn + band * 0.3, rOut - band * 0.3, band * 0.07);
    }
  } else if (type === "tachymeter") {
    const values = [400, 300, 250, 200, 180, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60];
    for (const v of values) {
      // время на единицу пути t = 3600/v секунд, доля оборота t/60 = 60/v
      const a = ang(60 / v);
      text(String(v), a, mid, band * 0.34);
    }
    for (let s = 9; s < 60; s += 0.5) {
      tick(ang(s / 60), rOut - band * 0.14, rOut - band * (s % 5 === 0 ? 0.3 : 0.22), band * 0.02);
    }
    text("TACHYMETRE", ang(0.02), mid, band * 0.26);
  } else if (type === "compass") {
    ["N", "E", "S", "W"].forEach((l, i) => text(l, ang(i / 4), mid, band * 0.5));
    for (let d = 0; d < 360; d += 15) if (d % 90) tick(ang(d / 360), rIn + band * 0.3, rOut - band * 0.3, band * 0.05);
  } else if (type === "slide_rule") {
    for (let i = 10; i < 100; i++) {
      const a = ang(Math.log10(i / 10));
      tick(a, rOut - band * 0.1, rOut - band * (i % 5 === 0 ? 0.35 : 0.22), band * 0.02);
      if (i % 5 === 0) text(String(i), a, rIn + band * 0.35, band * 0.22);
    }
  }
  return toTexture(canvas);
}

/** Гравировка на роторе автоподзавода (текст по дуге). */
export function paintRotor(label, { color = "#cfd2d6", size = 1024 } = {}) {
  const [canvas, ctx] = makeCanvas(size);
  const c = size / 2;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // «женевские волны» по кругу
  for (let r = 20; r < c; r += 26) {
    const g = ctx.createRadialGradient(c, c, r - 13, c, c, r + 13);
    g.addColorStop(0, "rgba(0,0,0,0.08)");
    g.addColorStop(0.5, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(40,42,46,0.85)";
  ctx.font = `600 ${size * 0.045}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const r = size * 0.36;
  const chars = label.toUpperCase().split("");
  const step = 0.075;
  let a = Math.PI / 2 + ((chars.length - 1) * step) / 2;
  for (const ch of chars) {
    ctx.save();
    ctx.translate(c + Math.cos(a) * r, c + Math.sin(a) * r);
    ctx.rotate(a - Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a -= step;
  }
  return toTexture(canvas);
}

/** Печатная плата кварцевого механизма. */
export function paintCircuit(size = 512) {
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = "#1d3a2c";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#c9a45a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    let x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      Math.random() > 0.5 ? (x += (Math.random() - 0.5) * 160) : (y += (Math.random() - 0.5) * 160);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#c9a45a";
  for (let i = 0; i < 30; i++) {
    ctx.beginPath(); ctx.arc(Math.random() * size, Math.random() * size, 5, 0, TAU); ctx.fill();
  }
  return toTexture(canvas);
}
