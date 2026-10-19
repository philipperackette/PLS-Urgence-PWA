export default {
  extends: "stylelint-config-recommended",
  rules: {
    // styles.css est organisé par blocs ajoutés à la suite (séquence illustrée,
    // téléphone, installation…) qui surchargent volontairement les règles
    // précédentes : regrouper les sélecteurs changerait l'ordre de la cascade.
    "no-duplicate-selectors": null,
    "no-descending-specificity": null,
  },
};
