import js from "@eslint/js";
import html from "eslint-plugin-html";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  {
    // app.js et les scripts intégrés aux pages : scripts classiques du navigateur.
    files: ["app.js", "**/*.html"],
    plugins: { html },
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.browser },
  },
  {
    files: ["service-worker.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.serviceworker },
  },
  {
    files: ["tools/**/*.cjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["tools/**/*.mjs", "*.config.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },
  {
    // Les fonctions passées à page.evaluate() s'exécutent dans la page.
    files: ["tests/**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
  },
];
