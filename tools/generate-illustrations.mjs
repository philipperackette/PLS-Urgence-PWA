#!/usr/bin/env node
/*
 * Génère les illustrations de la séquence PLS (images/*.svg).
 *
 *   node tools/generate-illustrations.mjs
 *
 * Vue de dessus, tête de la victime en haut, sauveteur (bleu) à gauche de
 * l'image, à genoux au niveau du thorax. Le côté opposé est obtenu dans
 * l'application par symétrie de l'image entière.
 *
 * Chaque bras et chaque jambe a une longueur fixe : le coude et le genou
 * sont calculés (cinématique inverse à deux segments) à partir de l'épaule
 * ou de la hanche et de la position voulue du poignet ou de la cheville.
 * Une position impossible à atteindre arrête la génération au lieu de
 * produire un membre étiré. Seuls les segments qui ne sont pas à plat
 * (bras du dessus en PLS, cuisses du sauveteur, jambe relevée) utilisent
 * une longueur projetée plus courte, déclarée explicitement.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'images');

/* ---------- Couleurs (reprises des illustrations d'origine) ---------- */
const C = {
  line: '#354557',
  skin: '#edb68e',
  skinLine: '#d8946d',
  shirt: '#cbd4da',
  shirtLine: '#a8b6c1',
  trousers: '#40546d',
  trousersLine: '#5d7089',
  shoe: '#253c56',
  rTrousers: '#262a31',
  rShoe: '#6b4a33',
  sole: '#e7edf1',
  hair: '#42352e',
  hairLine: '#5b4a3f',
  rShirt: '#2778b9',
  rShirtLine: '#175d94',
  rHair: '#4b382c',
  rHairLine: '#654d3c',
  floor: '#eef1f4',
  arrow: '#e8590c',
  ghost: '#9aa7b4',
  phone: '#1f2d3d',
  screen: '#8fd3ff'
};

/* ---------- Proportions (px ; environ 3,7 px par cm) ---------- */
const L = {
  upperArm: 118,
  forearm: 96,
  thigh: 163,
  shin: 155,
  armWidth: 27,
  legWidth: 44
};

/* ---------- Géométrie ---------- */
const P = (x, y) => ({ x, y });
const add = (a, b) => P(a.x + b.x, a.y + b.y);
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const len = (v) => Math.hypot(v.x, v.y);
const deg = (v) => Math.atan2(v.y, v.x) * 180 / Math.PI;
const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const r = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(p => `${r(p.x)} ${r(p.y)}`);

/**
 * Cinématique inverse à deux segments : renvoie l'articulation intermédiaire
 * (coude, genou) pour relier `root` à `target` avec des segments de longueurs
 * `a` et `b`. `bend` (+1 / -1) choisit de quel côté plie l'articulation.
 */
function ik(label, root, target, a, b, bend) {
  const d = len(sub(target, root));
  if (d > a + b + 0.01) throw new Error(`${label} : cible hors de portée (${d.toFixed(1)} > ${a + b})`);
  if (d < Math.abs(a - b) - 0.01) throw new Error(`${label} : cible trop proche (${d.toFixed(1)})`);
  const base = Math.atan2(target.y - root.y, target.x - root.x);
  const cos = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)));
  const ang = base + bend * Math.acos(cos);
  return P(root.x + a * Math.cos(ang), root.y + a * Math.sin(ang));
}

/* ---------- Primitives SVG ---------- */
const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
const path = (d, o = {}) => `<path d="${d}" ${attrs({ fill: 'none', stroke: C.line, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...o })}/>`;
const ellipse = (c, rx, ry, o = {}) => `<ellipse cx="${r(c.x)}" cy="${r(c.y)}" rx="${rx}" ry="${ry}" ${attrs({ fill: C.skin, stroke: C.line, 'stroke-width': 2, ...o })}/>`;
const group = (transform, body) => `<g transform="${transform}">${body}</g>`;
const poly = (list) => 'M' + pts(list).join(' L');

/** Membre épais avec contour : tracé de contour puis tracé de couleur. */
function limb(list, width, color) {
  const d = poly(list);
  return path(d, { stroke: C.line, 'stroke-width': width + 4 }) + path(d, { stroke: color, 'stroke-width': width });
}

/* Main (paume visible) : poignet à l'origine, doigts vers -y. */
const HAND = 'M-10 5 L-12 -10 Q-15 -19 -18 -25 Q-21 -32 -17 -34 Q-13 -35 -9 -25 L-7 -20 L-8 -43 Q-8 -49 -4 -49 Q0 -49 0 -43 L1 -29 L1 -50 Q1 -56 5 -56 Q9 -56 9 -50 L9 -29 L10 -46 Q10 -52 14 -51 Q18 -51 18 -45 L18 -25 L20 -38 Q21 -43 24 -42 Q28 -41 26 -35 L23 -15 Q22 -3 13 5 Z';
const PALM = 'M-7 -18 Q4 -24 16 -16 M-5 -7 Q2 -14 10 -10 M-7 -20 Q0 -15 -1 -5';
/* Main de profil (tranche) : poignet à l'origine, doigts vers -y. */
const HAND_EDGE = 'M-9 4 L-10 -22 Q-11 -40 -4 -48 Q2 -52 6 -46 L9 -24 L13 -30 Q17 -33 18 -27 L12 -8 Q10 2 8 4 Z';

/**
 * Main au bout de l'avant-bras `from` → `wrist`.
 * `flip` : main gauche/droite (pouce de l'autre côté) ; `view` : 'palm', 'back' ou 'edge'.
 */
function hand(from, wrist, { flip = false, view = 'palm', scale = 0.74, turn = 0, aim = null, squash = 1 } = {}) {
  // `aim` : direction absolue des doigts (degrés) ; sinon, dans le prolongement de l'avant-bras.
  // `squash` : main inclinée (vue de biais), plus étroite.
  const rot = (aim ?? deg(sub(wrist, from))) + 90 + turn;
  const s = squash === 1
    ? (flip ? `scale(${-scale} ${scale})` : `scale(${scale})`)
    : `scale(${r((flip ? -scale : scale) * squash * 100) / 100} ${scale})`;
  const shape = view === 'edge' ? HAND_EDGE : HAND;
  const body = path(shape, { fill: C.skin, 'stroke-width': 2.4 }) +
    (view === 'palm' ? path(PALM, { stroke: C.skinLine, 'stroke-width': 1.6 }) : '');
  return group(`translate(${r(wrist.x)} ${r(wrist.y)}) rotate(${r(rot)}) ${s}`, body);
}

/* Chaussure vue de dessus (semelle ou dessus) : cheville à l'origine, pointe vers +y. */
function shoeTop(at, dirDeg, color = C.shoe) {
  const body = path('M-15 -13 Q0 -19 15 -12 L19 22 Q15 34 -6 35 Q-23 34 -22 25 Z', { fill: color }) +
    path('M-20 25 Q-4 30 18 21', { stroke: C.sole, 'stroke-width': 5 }) +
    path('M-10 -1 L10 0 M-10 6 L11 7 M-10 13 L12 14', { stroke: '#98afc0' });
  return group(`translate(${r(at.x)} ${r(at.y)}) rotate(${r(dirDeg - 90)})`, body);
}

/* Chaussure de profil (victime sur le côté) : cheville à l'origine, pointe vers -x. */
function shoeSide(at, rot = 0) {
  const body = path('M8 -14 L10 12 L-34 14 Q-46 13 -45 3 Q-43 -5 -28 -7 L-8 -12 Z', { fill: C.shoe }) +
    path('M9 12 L-34 14 Q-44 13 -45 5', { stroke: C.sole, 'stroke-width': 4 });
  return group(`translate(${r(at.x)} ${r(at.y)}) rotate(${rot})`, body);
}

/** Bras : manche courte puis peau, et main. */
function arm(label, shoulder, wrist, { bend, sleeve, a = L.upperArm, b = L.forearm, hand: h = {}, elbow } = {}) {
  const e = elbow || ik(label, shoulder, wrist, a, b, bend);
  if (elbow) {
    const da = len(sub(e, shoulder)), db = len(sub(wrist, e));
    if (Math.abs(da - a) > 1 || Math.abs(db - b) > 1) throw new Error(`${label} : longueurs incohérentes (${da.toFixed(1)}, ${db.toFixed(1)})`);
  }
  return {
    elbow: e,
    svg: limb([shoulder, e, wrist], L.armWidth, C.skin) +
      limb([shoulder, lerp(shoulder, e, 0.36)], L.armWidth + 5, sleeve) +
      hand(e, wrist, h)
  };
}

/* ---------- Flèches et repères ---------- */
function arrow(d, { head, dir, width = 7 } = {}) {
  // Pointe de flèche placée en `head`, orientée selon `dir` (degrés).
  const tip = group(`translate(${r(head.x)} ${r(head.y)}) rotate(${r(dir)})`,
    path('M0 0 L-24 -13 L-18 0 L-24 13 Z', { fill: C.arrow, stroke: '#fff', 'stroke-width': 3 }) +
    path('M0 0 L-24 -13 L-18 0 L-24 13 Z', { fill: C.arrow, stroke: 'none' }));
  return path(d, { stroke: '#fff', 'stroke-width': width + 6 }) +
    path(d, { stroke: C.arrow, 'stroke-width': width }) + tip;
}

/** Position précédente d'un membre, en pointillés. */
function ghost(list, width) {
  return path(poly(list), { stroke: C.ghost, 'stroke-width': width, 'stroke-dasharray': '2 9', opacity: 0.9 });
}

/* ---------- Victime sur le dos ---------- */
const V = {
  head: P(400, 118),
  neck: P(400, 168),
  shoulderN: P(327, 194),   // côté sauveteur (à gauche de l'image)
  shoulderF: P(473, 194),
  hipN: P(364, 380),
  hipF: P(436, 380)
};

function supineTorso() {
  return path('M312 205 Q316 186 344 182 Q372 176 380 178 Q400 196 420 178 Q428 176 456 182 Q484 186 488 205 L478 300 L474 396 Q400 416 326 396 L322 300 Z', { fill: C.shirt }) +
    path('M383 181 Q400 200 417 181', { stroke: C.shirtLine }) +
    path('M338 370 Q400 386 462 370 M334 382 Q400 398 466 382', { stroke: C.shirtLine });
}

function supineHead({ glasses = 'off', mouthOpen = false } = {}) {
  const c = V.head;
  let s = limb([P(c.x, c.y + 30), V.neck], 30, C.skin);
  s += ellipse(P(c.x - 32, c.y + 3), 6, 10) + ellipse(P(c.x + 32, c.y + 3), 6, 10);
  s += ellipse(c, 31, 40);
  s += path(`M${c.x - 33} ${c.y - 2} Q${c.x - 36} ${c.y - 46} ${c.x} ${c.y - 47} Q${c.x + 36} ${c.y - 46} ${c.x + 33} ${c.y - 2} Q${c.x + 28} ${c.y - 26} ${c.x + 8} ${c.y - 28} Q${c.x - 22} ${c.y - 26} ${c.x - 33} ${c.y - 2} Z`, { fill: C.hair });
  s += path(`M${c.x - 20} ${c.y - 38} Q${c.x} ${c.y - 44} ${c.x + 18} ${c.y - 39}`, { stroke: C.hairLine, 'stroke-width': 2.5 });
  // Yeux fermés, nez, bouche
  s += path(`M${c.x - 20} ${c.y + 1} Q${c.x - 12} ${c.y + 6} ${c.x - 5} ${c.y + 1} M${c.x + 5} ${c.y + 1} Q${c.x + 12} ${c.y + 6} ${c.x + 20} ${c.y + 1}`, { stroke: '#674634', 'stroke-width': 2 });
  s += path(`M${c.x} ${c.y + 6} Q${c.x + 4} ${c.y + 15} ${c.x - 2} ${c.y + 17}`, { stroke: C.skinLine });
  s += mouthOpen
    ? ellipse(P(c.x, c.y + 26), 7, 5, { fill: '#7a3b35', 'stroke-width': 1.6 })
    : path(`M${c.x - 9} ${c.y + 25} Q${c.x} ${c.y + 29} ${c.x + 9} ${c.y + 25}`, { stroke: '#8a5a48' });
  if (glasses === 'on') s += glassesShape(P(c.x, c.y + 2), 1);
  return s;
}

function glassesShape(c, sc, rot = 0) {
  const g = path('M-26 -8 H-6 Q-4 -8 -4 -5 V4 Q-4 9 -9 9 H-23 Q-28 9 -28 4 V-5 Q-28 -8 -26 -8 Z M6 -8 H26 Q28 -8 28 -5 V4 Q28 9 23 9 H9 Q4 9 4 4 V-5 Q4 -8 6 -8 Z', { fill: 'rgba(200,230,255,.35)', stroke: '#1d2733', 'stroke-width': 3 }) +
    path('M-4 -3 Q0 -6 4 -3 M-28 -4 L-36 -2 M28 -4 L36 -2', { stroke: '#1d2733', 'stroke-width': 3 });
  return group(`translate(${r(c.x)} ${r(c.y)}) rotate(${rot}) scale(${sc})`, g);
}

/** Jambes sur le dos ; `ankleN` / `ankleF` : positions des chevilles. */
function supineLegs({ ankleN = P(344, 690), ankleF = P(456, 690), kneeUpF = null } = {}) {
  let s = path('M326 392 Q400 412 474 392 L470 425 Q400 440 330 425 Z', { fill: C.trousers });
  const kneeN = ik('jambe proche', V.hipN, ankleN, L.thigh, L.shin, 1);
  s += limb([V.hipN, kneeN, ankleN], L.legWidth, C.trousers) + shoeTop(ankleN, deg(sub(ankleN, kneeN)));
  if (kneeUpF) {
    s += raisedLeg(kneeUpF);
  } else {
    const kneeF = ik('jambe éloignée', V.hipF, ankleF, L.thigh, L.shin, -1);
    s += limb([V.hipF, kneeF, ankleF], L.legWidth, C.trousers) + shoeTop(ankleF, deg(sub(ankleF, kneeF)));
  }
  return s;
}

/** Jambe éloignée relevée : cuisse et jambe inclinées, donc raccourcies en vue de dessus. */
function raisedLeg({ knee, ankle }) {
  return shoeTop(ankle, 90) +
    limb([knee, ankle], L.legWidth - 2, C.trousers) +
    limb([V.hipF, knee], L.legWidth + 2, C.trousersLine) +
    ellipse(knee, 25, 22, { fill: C.trousersLine }) +
    path(poly([lerp(V.hipF, knee, 0.25), lerp(V.hipF, knee, 0.85)]), { stroke: '#7d8fa6', 'stroke-width': 2 });
}

/* Bras de la victime sur le dos. */
const armAlongN = { wrist: P(310, 404), bend: 1 };
const armAlongF = { wrist: P(490, 404), bend: -1 };
function victimArm(label, shoulder, { wrist, bend, elbow, hand: h = {}, a, b }) {
  return arm(label, shoulder, wrist, { bend, elbow, sleeve: C.shirt, hand: { scale: 0.7, ...h }, a, b }).svg;
}

/* ---------- Victime en PLS (sur le côté, face au sauveteur) ---------- */
const S = {
  head: P(352, 122),
  shoulderLow: P(343, 204),
  shoulderTop: P(368, 200),
  hipLow: P(372, 396),
  hipTop: P(380, 388)
};

function sideTorso() {
  return path('M352 176 Q322 184 316 214 Q312 254 322 292 Q330 322 326 350 Q322 384 344 408 L408 408 Q420 300 410 200 Q404 178 380 174 Z', { fill: C.shirt }) +
    path('M330 300 Q352 306 366 298 M404 214 Q412 300 404 396', { stroke: C.shirtLine });
}

/** Tête de profil, visage vers la gauche (vers le sauveteur). */
function sideHead({ tilt = 0, mouthOpen = false } = {}) {
  const c = S.head;
  const face = path('M18 -40 Q40 -35 42 -11 Q44 12 29 31 L16 49 L-11 46 Q-20 40 -21 30 L-34 25 L-28 18 L-36 14 L-49 9 Q-51 5 -44 2 L-34 -8 Q-32 -33 -6 -39 Z', { fill: C.skin, 'stroke-width': 2.2 }) +
    path('M-35 -14 Q-35 -46 -2 -46 Q30 -53 42 -27 Q51 -7 38 20 L26 30 L21 11 Q30 -4 16 -11 L1 -19 Q-18 -17 -27 -28 Z', { fill: C.hair, 'stroke-width': 2.2 }) +
    ellipse(P(19, 0), 7, 10) +
    path('M18 -5 Q25 -2 18 6 M-35 -5 Q-29 -2 -22 -5', { stroke: '#674634', 'stroke-width': 1.8 }) +
    (mouthOpen
      ? path('M-36 17 Q-30 25 -22 20 L-26 15 Z', { fill: '#7a3b35', 'stroke-width': 1.6 })
      : path('M-34 19 L-24 20', { stroke: '#8a5a48', 'stroke-width': 1.8 }));
  return group(`translate(${c.x} ${c.y}) rotate(${tilt}) scale(1.08)`, face);
}

/* ---------- Sauveteur à genoux, face à la victime ---------- */
/*
 * Le sauveteur est dessiné dans son propre repère, décalé de RO par rapport
 * à la victime (décalée de VO). Les cibles des mains sont données dans le
 * repère de la victime et converties.
 */
const VO = 22;   // décalage de la victime vers la droite
const RO = -26;  // décalage du sauveteur vers la gauche
const toRescuer = (p) => P(p.x + VO - RO, p.y);

const R = {
  hips: P(212, 300),
  shoulderUp: P(236, 244),
  shoulderDown: P(236, 358)
};

/** Posture : `lean` avance les épaules et la tête (penché au-dessus de la victime). */
function rescuerPose(lean = 0) {
  return {
    lean,
    up: add(R.shoulderUp, P(lean, 0)),
    down: add(R.shoulderDown, P(lean, 0)),
    head: P(R.hips.x + 34 + lean, R.hips.y)
  };
}

function rescuerLegs() {
  const k1 = P(292, 268), k2 = P(292, 334);
  const a1 = P(142, 262), a2 = P(142, 342);
  const h1 = P(212, 268), h2 = P(212, 334);
  return limb([k1, a1], 38, C.rTrousers) + limb([k2, a2], 38, C.rTrousers) +
    shoeTop(a1, 180, C.rShoe) + shoeTop(a2, 180, C.rShoe) +
    limb([h1, k1], L.legWidth, C.rTrousers) + limb([h2, k2], L.legWidth, C.rTrousers);
}

function rescuerTorso(pose) {
  const h = R.hips, l = pose.lean;
  return path(`M${h.x - 26} ${h.y - 74} Q${h.x + 24 + l} ${h.y - 90} ${h.x + 40 + l} ${h.y - 56} L${h.x + 44 + l} ${h.y + 56} Q${h.x + 24 + l} ${h.y + 90} ${h.x - 26} ${h.y + 74} Q${h.x - 48} ${h.y} ${h.x - 26} ${h.y - 74} Z`, { fill: C.rShirt }) +
    path(`M${h.x - 22} ${h.y - 40} Q${h.x - 32} ${h.y} ${h.x - 22} ${h.y + 40}`, { stroke: C.rShirtLine });
}

function rescuerHead(pose, turn = 0) {
  const c = pose.head;
  const body = ellipse(P(0, -30), 6, 9) + ellipse(P(0, 30), 6, 9) +
    ellipse(P(14, 0), 26, 28) +
    path('M28 -6 Q38 0 28 6', { fill: C.skin }) +
    `<circle cx="-4" cy="0" r="30" fill="${C.rHair}" stroke="${C.line}" stroke-width="2"/>` +
    path('M-24 -12 Q-4 -22 18 -10 M-26 2 Q-2 -6 20 4 M-22 14 Q0 10 16 18', { stroke: C.rHairLine, 'stroke-width': 3 });
  return group(`translate(${r(c.x)} ${r(c.y)}) rotate(${turn})`, body);
}

/**
 * Bras du sauveteur vers `target` (repère de la victime, sauf `local`).
 */
function rescuerArm(pose, which, target, opts = {}) {
  const shoulder = which === 'up' ? pose.up : pose.down;
  const wrist = opts.local ? target : toRescuer(target);
  return arm(`bras ${which === 'up' ? 'haut' : 'bas'} du sauveteur`, shoulder, wrist, {
    bend: opts.bend ?? (which === 'up' ? -1 : 1), sleeve: C.rShirt, a: opts.a, b: opts.b,
    hand: { flip: which === 'down', ...opts.hand }
  }).svg;
}

/*
 * Main libre : sur la cuisse, ou au sol devant les genoux quand le sauveteur
 * se penche. Le bras descend presque verticalement : longueurs projetées.
 */
const REST = { a: 64, b: 54 };
const restUp = (pose) => rescuerArm(pose, 'up', P(288 + pose.lean, 256), { local: true, ...REST, hand: { view: 'back' } });
const restDown = (pose) => rescuerArm(pose, 'down', P(288 + pose.lean, 346), { local: true, ...REST, hand: { view: 'back' } });

/**
 * Sauveteur complet. `arms(pose)` renvoie le SVG des bras ; `under` contient
 * ce qui doit passer sous la tête de la victime (dessiné dans le repère de la victime).
 */
function rescuer({ lean = 0, turn = 0, arms, extra = '', top = '' } = {}) {
  const pose = rescuerPose(lean);
  return group(`translate(${RO} 0)`,
    rescuerLegs() + rescuerTorso(pose) + extra + (arms ? arms(pose) : restUp(pose) + restDown(pose)) + rescuerHead(pose, turn) + top);
}
const victim = (body) => group(`translate(${VO} 0)`, body);

function phone(at, rot = 0) {
  return group(`translate(${at.x} ${at.y}) rotate(${rot})`,
    `<rect x="-11" y="-20" width="22" height="40" rx="5" fill="${C.phone}" stroke="${C.line}" stroke-width="2"/>` +
    `<rect x="-7" y="-15" width="14" height="27" rx="2" fill="${C.screen}"/>`);
}

function floor() {
  return ellipse(P(400 + VO, 420), 118, 330, { fill: C.floor, stroke: 'none' }) +
    ellipse(P(205 + RO, 300), 110, 120, { fill: C.floor, stroke: 'none' });
}

function svg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img"><title>${title}</title><rect width="600" height="800" fill="white"/>${body}</svg>\n`;
}

/* ---------- Scènes ---------- */

/** Victime sur le dos, avec les options de chaque étape. */
function supine(o = {}) {
  return supineLegs(o.legs) + supineTorso() +
    victimArm('bras proche de la victime', V.shoulderN, o.armN || armAlongN) +
    (o.armFOver ? '' : victimArm('bras éloigné de la victime', V.shoulderF, o.armF || armAlongF)) +
    supineHead(o.head) +
    (o.armFOver ? victimArm('bras éloigné de la victime', V.shoulderF, o.armF) : '');
}


/** Victime en PLS ; `rescuerHandUnderHead` dessine la main du sauveteur sous la tête. */
function lateral(o = {}) {
  let s = '';
  // Jambe du dessous : allongée dans l'axe.
  // Jambe du dessous : tendue dans l'axe du corps.
  const ankleLow = P(378, 713);
  const kneeLow = ik('jambe du dessous', S.hipLow, ankleLow, L.thigh, L.shin, -1);
  s += limb([S.hipLow, kneeLow, ankleLow], L.legWidth, C.trousers) + shoeSide(ankleLow, 0);
  // Bras du dessous : à angle droit devant le corps, paume vers le haut.
  const elbowLow = P(S.shoulderLow.x - L.upperArm, S.shoulderLow.y + 4);
  const forearmDir = -80 * Math.PI / 180;   // avant-bras vers la tête, légèrement incliné
  const wristLow = add(elbowLow, P(L.forearm * Math.cos(forearmDir), L.forearm * Math.sin(forearmDir)));
  s += arm('bras du dessous', S.shoulderLow, wristLow, { elbow: elbowLow, sleeve: C.shirt, hand: { scale: 0.7, flip: true } }).svg;
  s += sideTorso();
  // Jambe du dessus : hanche et genou à angle droit, genou au sol devant le corps.
  const legTop = o.legTop || { knee: P(S.hipTop.x - L.thigh, S.hipTop.y + 12), ankle: P(S.hipTop.x - L.thigh + 8, S.hipTop.y + 12 + L.shin - 0.1) };
  s += limb([S.hipTop, legTop.knee, legTop.ankle], L.legWidth, C.trousers) + shoeSide(legTop.ankle, 0);
  s += path(poly([lerp(S.hipTop, legTop.knee, 0.35), lerp(S.hipTop, legTop.knee, 0.9)]), { stroke: C.trousersLine });
  // Main du sauveteur sous la tête : dessinée ici pour que la tête la recouvre.
  if (o.underHead) s += group(`translate(${RO - VO} 0)`, o.underHead);
  // Bras du dessus : main sous la joue (projection raccourcie : le bras descend vers le sol).
  // Le dos de la main est sous la joue : la tête, dessinée ensuite, la recouvre en partie.
  s += arm('bras du dessus', S.shoulderTop, P(334, 150), { bend: -1, a: 92, b: 90, sleeve: C.shirt, hand: { scale: 0.7, view: 'back', turn: -10 } }).svg;
  s += sideHead(o.head);
  return s;
}

const scenes = {};

const legsApart = { ankleN: P(336, 690), ankleF: P(464, 690) };
const legsTogether = { ankleN: P(372, 694), ankleF: P(428, 694) };

scenes.supine = () => svg('Position de départ — victime sur le dos, sauveteur à genoux au niveau du thorax',
  floor() + victim(supine({ legs: legsApart, head: { glasses: 'on' } })) + rescuer());

scenes.glasses = () => svg('Retirez les lunettes',
  floor() +
  victim(supine({ legs: legsApart }) + glassesShape(P(352, 104), 1, -14) +
    arrow('M346 84 Q318 68 292 78', { head: P(286, 80), dir: 165 })) +
  rescuer({ lean: 30, arms: (p) => restDown(p) + rescuerArm(p, 'up', P(346, 126), { hand: { view: 'edge', turn: 30 } }) }));

scenes.align = () => svg('Alignez les jambes',
  floor() +
  victim(ghost([V.hipN, P(356, 535), P(336, 690)], 30) + ghost([V.hipF, P(444, 535), P(464, 690)], 30) +
    supine({ legs: legsTogether }) +
    arrow('M328 646 Q346 666 358 682', { head: P(362, 688), dir: 55 }) +
    arrow('M472 646 Q454 666 442 682', { head: P(438, 688), dir: 125 })) +
  rescuer({ lean: 20, arms: (p) => restUp(p) + rescuerArm(p, 'down', P(372, 470), { hand: { view: 'back', turn: 10 } }) }));

/* Bras proche à angle droit, paume vers le haut. */
const armRightAngle = { elbow: P(209, 194), wrist: P(209, 98), hand: { scale: 0.7, flip: true } };
/* Dos de la main éloignée contre l'oreille proche ; coude sur la poitrine. */
/*
 * Dos de la main éloignée contre l'oreille proche (à gauche du visage) :
 * main posée de biais contre le côté de la tête, doigts vers le haut de la tête.
 * La main du sauveteur est paume contre paume, juste à côté.
 */
const farHandAtEar = { wrist: P(364, 150), bend: -1, hand: { scale: 0.7, view: 'back', aim: -92, squash: 0.7, flip: true } };
const holdHandAtEar = (p) => rescuerArm(p, 'up', P(344, 154), { hand: { view: 'back', aim: -95, squash: 0.8 } });

scenes.nearArm = () => svg('Placez le bras proche à angle droit, paume vers le haut',
  floor() +
  victim(ghost([V.shoulderN, P(318, 300), P(310, 404)], 22) +
    supine({ legs: legsTogether, armN: armRightAngle }) +
    arrow('M300 336 Q250 318 222 232', { head: P(219, 222), dir: -100 })) +
  rescuer({ arms: (p) => restDown(p) + rescuerArm(p, 'up', P(236, 196), { hand: { view: 'back', turn: -10 } }) }));

scenes.farArm = () => svg('Placez le dos de la main opposée contre l’oreille, paume contre paume',
  floor() +
  victim(ghost([V.shoulderF, P(484, 300), P(490, 404)], 22) +
    supine({ legs: legsTogether, armN: armRightAngle, armF: farHandAtEar, armFOver: true }) +
    arrow('M510 336 Q500 250 440 226', { head: P(430, 222), dir: 196 })) +
  rescuer({ lean: 30, arms: (p) => restDown(p) + holdHandAtEar(p) }));

/*
 * Genou relevé, saisi par-dessous : la jambe relevée est redessinée par-dessus
 * le bras du sauveteur, dont la main passe sous le genou (seuls le bout des
 * doigts dépassent de l'autre côté).
 */
const kneeUp = { knee: P(442, 474), ankle: P(436, 600) };
scenes.knee = () => svg('Relevez le genou opposé en le saisissant par-dessous, pied au sol',
  floor() +
  victim(ghost([V.hipF, P(430, 540), P(428, 694)], 30) +
    supine({ legs: { ankleN: P(372, 694), kneeUpF: kneeUp }, armN: armRightAngle, armF: farHandAtEar, armFOver: true })) +
  rescuer({ lean: 80, arms: (p) => holdHandAtEar(p) + rescuerArm(p, 'down', P(436, 482), { hand: { aim: 8 } }) }) +
  victim(raisedLeg(kneeUp) + arrow('M462 676 Q476 630 460 606', { head: P(456, 598), dir: -115 })));

/* Après le retournement : main du sauveteur sous la tête, recouverte par la tête. */
const handUnderHead = rescuerArm(rescuerPose(30), 'up', P(318, 140), { hand: { turn: 10 } });

scenes.roll = () => svg('Faites rouler la personne vers vous',
  floor() +
  victim(lateral({ underHead: handUnderHead }) +
    arrow('M478 250 Q478 180 440 160', { head: P(430, 156), dir: 196 }) +
    arrow('M474 520 Q440 590 352 574', { head: P(342, 570), dir: 196 })) +
  rescuer({ lean: 30, arms: (p) => rescuerArm(p, 'down', P(236, 404), { hand: { view: 'back', turn: -10 } }) }));

scenes.withdraw = () => svg('Retirez votre main de sous la tête en maintenant le coude',
  floor() +
  victim(lateral() + arrow('M300 148 Q272 160 262 184', { head: P(258, 192), dir: 115 })) +
  rescuer({ lean: 20, arms: (p) => rescuerArm(p, 'up', P(252, 206), { hand: { view: 'back', turn: -30 } }) +
    rescuerArm(p, 'down', P(296, 262), { hand: { view: 'back', turn: -40 } }) }));

scenes.leg = () => svg('Réglez la jambe du dessus : hanche et genou à angle droit',
  floor() +
  victim(lateral() + arrow('M170 474 Q166 432 186 410', { head: P(192, 404), dir: -50 })) +
  rescuer({ arms: (p) => restUp(p) + rescuerArm(p, 'down', P(226, 414), { hand: { view: 'back', turn: -20 } }) }));

scenes.head = () => svg('Inclinez doucement la tête en arrière',
  floor() +
  victim(lateral({ head: { tilt: 12 } }) + arrow('M378 70 Q406 82 406 110', { head: P(406, 118), dir: 90 })) +
  rescuer({ lean: 40, arms: (p) => restDown(p) + rescuerArm(p, 'up', P(334, 90), { hand: { view: 'back', turn: 40 } }) }));

scenes.mouth = () => svg('Ouvrez la bouche sans déplacer la tête',
  floor() +
  victim(lateral({ head: { tilt: 12, mouthOpen: true } }) + arrow('M280 168 Q290 186 304 192', { head: P(310, 194), dir: 20 })) +
  rescuer({ lean: 30, arms: (p) => restDown(p) + rescuerArm(p, 'up', P(306, 154), { hand: { view: 'edge', turn: 60 } }) }));

scenes.call = () => svg('Appelez le 112 sur haut-parleur en restant auprès de la personne',
  floor() +
  victim(lateral({ head: { tilt: 12, mouthOpen: true } })) +
  rescuer({ arms: (p) => restDown(p) + rescuerArm(p, 'up', P(292, 250), { local: true, hand: { view: 'back', turn: -60 } }),
    top: phone(P(300, 236), 10) + path('M322 212 Q336 234 322 256 M334 202 Q354 234 334 266', { stroke: C.arrow, 'stroke-width': 5 }) }));

scenes.monitor = () => svg('Surveillez la respiration sans interruption',
  floor() +
  victim(lateral({ head: { tilt: 12, mouthOpen: true } }) +
    path('M292 160 Q280 170 288 182 M278 150 Q260 170 274 192', { stroke: C.arrow, 'stroke-width': 4 })) +
  rescuer({ lean: 20, turn: -20, arms: (p) => rescuerArm(p, 'up', P(318, 236), { hand: { view: 'back', turn: -40 } }) +
    rescuerArm(p, 'down', P(344, 300), { hand: { view: 'back', turn: -60 } }),
    extra: phone(P(118, 420), 80) + path('M136 392 Q154 420 136 448 M148 382 Q172 420 148 458', { stroke: C.arrow, 'stroke-width': 4 }) }));

mkdirSync(OUT, { recursive: true });
for (const [name, build] of Object.entries(scenes)) {
  writeFileSync(join(OUT, `${name}.svg`), build());
}
console.log(`${Object.keys(scenes).length} illustrations écrites dans ${OUT}`);
