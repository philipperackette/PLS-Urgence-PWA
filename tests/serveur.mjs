// Serveur statique minimal pour les tests (le service worker exige http://).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const RACINE = resolve(import.meta.dirname, "..");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

createServer(async (req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const fichier = normalize(join(RACINE, chemin === "/" ? "/index.html" : chemin));
  if (!fichier.startsWith(RACINE)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { "Content-Type": TYPES[extname(fichier)] || "application/octet-stream" });
    res.end(contenu);
  } catch {
    res.writeHead(404).end("Introuvable");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}/`));
