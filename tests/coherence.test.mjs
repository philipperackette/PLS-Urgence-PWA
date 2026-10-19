// Vérifications sans navigateur : cache hors ligne, manifeste, illustrations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const RACINE = resolve(import.meta.dirname, "..");
const lire = (f) => readFileSync(join(RACINE, f), "utf8");

const sw = lire("service-worker.js");
const ASSETS = JSON.parse(sw.match(/const ASSETS = (\[[^\]]*\]);/)[1]);
const fichiers = ASSETS.filter((a) => a !== "./").map((a) => a.replace(/^\.\//, ""));

test("service worker : chaque ressource du cache existe", () => {
  for (const f of fichiers) assert.ok(existsSync(join(RACINE, f)), `${f} absent`);
  assert.equal(new Set(ASSETS).size, ASSETS.length, "ressource en double");
});

test("service worker : toutes les pages, images et icônes sont en cache", () => {
  const attendus = ["index.html", "main.html", "apercu.html", "app.js", "styles.css", "manifest.webmanifest"];
  for (const dossier of ["images", "icons"]) {
    for (const f of readdirSync(join(RACINE, dossier))) attendus.push(`${dossier}/${f}`);
  }
  for (const f of attendus) assert.ok(fichiers.includes(f), `${f} manque dans ASSETS`);
});

test("service worker : nom de cache versionné", () => {
  assert.match(sw, /const CACHE = 'pls-urgence-v\d+';/);
});

// Largeur et hauteur d'un PNG (en-tête IHDR).
function taillePng(f) {
  const b = readFileSync(join(RACINE, f));
  assert.equal(b.toString("latin1", 1, 4), "PNG", `${f} n'est pas un PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

test("manifeste : JSON valide, icônes présentes aux bonnes dimensions", () => {
  const m = JSON.parse(lire("manifest.webmanifest"));
  for (const champ of ["name", "short_name", "start_url", "scope", "display", "icons"]) {
    assert.ok(m[champ], `champ ${champ} manquant`);
  }
  assert.ok(existsSync(join(RACINE, m.start_url)), "start_url introuvable");
  const usages = new Set();
  for (const icone of m.icons) {
    assert.equal(taillePng(icone.src), icone.sizes, `${icone.src} : dimensions`);
    usages.add(`${icone.purpose} ${icone.sizes}`);
  }
  for (const u of ["any 192x192", "any 512x512", "maskable 192x192", "maskable 512x512"]) {
    assert.ok(usages.has(u), `icône ${u} manquante`);
  }
  assert.equal(taillePng("icons/apple-touch-icon.png"), "180x180");
});

test("illustrations : une image SVG par étape, plus la position de départ", () => {
  const types = [...lire("app.js").matchAll(/"kind": "(\w+)"/g)].map((m) => m[1]);
  assert.equal(types.length, 12);
  const svg = readdirSync(join(RACINE, "images")).filter((f) => f.endsWith(".svg"));
  assert.deepEqual(svg.sort(), [...types, "supine"].map((t) => `${t}.svg`).sort());
  for (const f of svg) {
    const contenu = lire(`images/${f}`);
    assert.match(contenu, /^<svg [^>]*viewBox="0 0 600 800"/, `${f} : en-tête SVG`);
    assert.match(contenu, /<\/svg>\s*$/, `${f} : fin du SVG`);
    assert.match(contenu, /<title>[^<]+<\/title>/, `${f} : titre accessible`);
  }
});

test("apercu.html présente les 12 étapes dans l'ordre du guide", () => {
  const titres = [...lire("app.js").matchAll(/"title": "([^"]+)"/g)].map((m) => m[1]);
  const apercu = [...lire("apercu.html").matchAll(/<h2>\d+ · ([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(apercu, titres);
});
