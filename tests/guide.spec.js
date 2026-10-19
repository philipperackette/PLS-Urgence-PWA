/* global isIOS */
import { test, expect } from "@playwright/test";

const TYPES = ["glasses", "align", "nearArm", "farArm", "knee", "roll", "withdraw", "leg", "head", "mouth", "call", "monitor"];

let erreurs;
test.beforeEach(async ({ page }) => {
  erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
  // Lecture vocale coupée : les tests ne dépendent pas des voix installées.
  await page.addInitScript(() => localStorage.setItem("pls-voice", "off"));
});
test.afterEach(() => {
  expect(erreurs, "erreurs JavaScript ou ressources introuvables").toEqual([]);
});

const titre = (page) => page.locator("#app h1");

async function jusquAuGuide(page, cote = "left", { charger = true } = {}) {
  if (charger) await page.goto("main.html");
  await page.getByRole("button", { name: "NON, AUCUNE RÉACTION" }).click();
  await page.getByRole("button", { name: "OUI, ELLE RESPIRE" }).click();
  await expect(titre(page)).toHaveText("De quel côté êtes-vous ?");
  await page.click(`[data-action="choose-${cote}"]`);
}

async function imageChargee(locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
}

test("parcours complet : 12 étapes puis surveillance", async ({ page }) => {
  await jusquAuGuide(page);
  for (let i = 0; i < 12; i++) {
    await expect(page.locator(".step-label")).toHaveText(`Étape ${i + 1} sur 12`);
    const image = page.locator(".diagram-card img");
    await expect(image).toHaveAttribute("src", `images/${TYPES[i]}.svg`);
    await imageChargee(image);
    await expect(page.locator(".scene")).not.toHaveClass(/mirror/);
    await page.click('[data-action="next"]');
  }
  await expect(titre(page)).toHaveText("Surveillez sa respiration");
  await expect(page.locator('#app a[href="tel:112"]')).toBeVisible();
});

test("précédent, flèches du clavier et changement de côté", async ({ page }) => {
  await jusquAuGuide(page, "right");
  await expect(page.locator(".scene")).toHaveClass(/mirror/);
  await expect(page.locator(".side-bar span")).toHaveText("Sauveteur à droite de l’image");
  await expect(page.locator('[data-action="back"]')).toBeDisabled();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".step-label")).toHaveText("Étape 3 sur 12");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".step-label")).toHaveText("Étape 2 sur 12");
  await page.click('[data-action="back"]');
  await expect(page.locator(".step-label")).toHaveText("Étape 1 sur 12");

  await page.click('[data-action="side"]');
  await expect(page.locator(".scene")).not.toHaveClass(/mirror/);
  await expect(page.locator(".side-bar span")).toHaveText("Sauveteur à gauche de l’image");
});

test("la personne réagit : pas de PLS", async ({ page }) => {
  await page.goto("main.html");
  await expect(titre(page)).toHaveText("La personne réagit-elle ?");
  await page.getByRole("button", { name: "OUI, ELLE RÉAGIT" }).click();
  await expect(titre(page)).toHaveText("La personne réagit");
  await page.getByRole("button", { name: "RECOMMENCER L’EXAMEN" }).click();
  await expect(titre(page)).toHaveText("La personne réagit-elle ?");
});

test("respiration absente : écran de réanimation, depuis le début ou pendant la PLS", async ({ page }) => {
  await page.goto("main.html");
  await page.getByRole("button", { name: "NON, AUCUNE RÉACTION" }).click();
  await page.getByRole("button", { name: "NON / JE NE SAIS PAS" }).click();
  await expect(titre(page)).toHaveText("Commencez la réanimation");
  await expect(page.locator('#app a[href="tel:112"]')).toBeVisible();

  // Un rechargement ramènerait à l'écran de réanimation : on recommence depuis l'écran.
  await page.getByRole("button", { name: "RECOMMENCER L’EXAMEN" }).click();
  await jusquAuGuide(page, "left", { charger: false });
  await page.getByRole("button", { name: "RESPIRATION ABSENTE OU ANORMALE" }).click();
  await expect(titre(page)).toHaveText("Commencez la réanimation");
});

test("décompte de 10 secondes", async ({ page }) => {
  await page.clock.install();
  await page.goto("main.html");
  await page.getByRole("button", { name: "NON, AUCUNE RÉACTION" }).click();
  const bouton = page.locator('[data-action="timer"]');
  await bouton.click();
  await expect(bouton).toBeDisabled();
  await page.clock.runFor(4000);
  await expect(page.locator("#timer")).toHaveText("6");
  await page.clock.runFor(6000);
  await expect(page.locator("#timer")).toHaveText("0");
  await expect(bouton).toHaveText("10 SECONDES ÉCOULÉES");
  await expect(page.locator("#timer-status")).toHaveText(/Dix secondes écoulées/);
});

test("un rechargement ramène à l’écran en cours", async ({ page }) => {
  await jusquAuGuide(page, "right");
  await page.click('[data-action="next"]');
  await page.click('[data-action="next"]');
  await page.reload();
  await expect(page.locator(".step-label")).toHaveText("Étape 3 sur 12");
  await expect(page.locator(".scene")).toHaveClass(/mirror/);
});

test("écran « Mettre une icône sur mon téléphone »", async ({ page }) => {
  await page.goto("main.html");
  await page.click("#install-link");
  await expect(titre(page)).toHaveText("Mettre une icône sur le téléphone");
  // Les instructions du système de l'appareil viennent en premier.
  const ios = await page.evaluate(() => isIOS());
  expect(ios).toBe(test.info().project.name === "petit-telephone");
  await expect(page.locator(".install-os")).toHaveText(ios ? ["iPhone / iPad", "Android"] : ["Android", "iPhone / iPad"]);
  await page.getByRole("button", { name: "RETOUR" }).click();
  await expect(titre(page)).toHaveText("La personne réagit-elle ?");
});

test("mise en page : bouton « Étape suivante » visible sans défiler, pas de défilement horizontal", async ({ page }) => {
  await jusquAuGuide(page);
  for (let i = 0; i < 12; i++) {
    await expect(page.locator('[data-action="next"]')).toBeInViewport();
    const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debord, `étape ${i + 1}`).toBeLessThanOrEqual(0);
    await page.click('[data-action="next"]');
  }
});

test("zones tactiles d’au moins 44 px", async ({ page }) => {
  await jusquAuGuide(page);
  const petites = await page.evaluate(() =>
    [...document.querySelectorAll("button, a")]
      .filter((el) => el.offsetParent !== null && !el.classList.contains("skip-link"))
      .map((el) => ({ el: el.textContent.trim() || el.getAttribute("aria-label"), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ el, r }) => `${el} (${Math.round(r.width)}×${Math.round(r.height)})`));
  expect(petites).toEqual([]);
});

test("hors ligne : le service worker met tout en cache et le guide s’ouvre sans réseau", async ({ page, context }) => {
  await page.goto("main.html");
  await expect(page.locator("#offline-status")).toHaveText("Guide disponible hors ligne");
  const nombre = await page.evaluate(async () => {
    const noms = (await caches.keys()).filter((n) => n.startsWith("pls-urgence-"));
    return noms.length === 1 ? (await (await caches.open(noms[0])).keys()).length : -noms.length;
  });
  expect(nombre).toBeGreaterThanOrEqual(26);

  await context.setOffline(true);
  await page.goto("main.html?source=qr");
  await expect(titre(page)).toHaveText("La personne réagit-elle ?");
  await jusquAuGuide(page);
  await imageChargee(page.locator(".diagram-card img"));
  await page.goto("apercu.html");
  await expect(page.locator("article")).toHaveCount(12);
  await context.setOffline(false);
});

test("index.html redirige vers le guide en gardant les paramètres", async ({ page }) => {
  await page.goto("index.html?source=qr#app");
  await expect(page).toHaveURL(/\/main\.html\?source=qr#app$/);
  await expect(titre(page)).toHaveText("La personne réagit-elle ?");
});

test("aperçu : 12 étapes illustrées, inversion du côté", async ({ page }) => {
  await page.goto("apercu.html");
  const images = page.locator("article img");
  await expect(images).toHaveCount(12);
  for (let i = 0; i < 12; i++) await imageChargee(images.nth(i));
  const bouton = page.locator("#side");
  await bouton.click();
  await expect(page.locator("body")).toHaveClass(/right/);
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
  await expect(bouton).toHaveText("Sauveteur à droite de l’image · inverser");
});
