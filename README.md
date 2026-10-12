# prefecture-delays

![Last updated](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fumaki000%2Fprefecture-delays%2Fmain%2Fdata%2Fdelays-latest.json&query=%24.generatedAt&label=last%20updated&color=blue)
![License: ODbL-1.0](https://img.shields.io/badge/license-ODbL--1.0-lightgrey)

> French naturalisation processing delays, by préfecture / regional platform.
> 🇫🇷 Délais de naturalisation française, par préfecture / plateforme régionale.

---

## 🇫🇷 Français

### Description

Ce dépôt publie, en JSON ouvert, le délai médian observé entre le dépôt d'un
dossier de naturalisation sur l'ANEF et la publication du décret au Journal
officiel — préfecture par préfecture (36 plateformes régionales couvrant les
101 départements français).

**Ces données ne sont pas un chiffre officiel de l'administration.** Elles
sont calculées par [naturalisation-facile.fr](https://naturalisation-facile.fr)
à partir de témoignages publics volontaires et de dossiers ANEF anonymisés
soumis par ses utilisateurs — un échantillon auto-sélectionné, pas un tirage
aléatoire représentatif. Elles donnent une tendance utile, pas une garantie
de délai.

### Méthodologie de collecte

[`scripts/collect.mjs`](scripts/collect.mjs) récupère les pages publiques
`naturalisation-facile.fr/prefecture/<slug>` (contenu HTML rendu serveur, pas
une API privée) et en extrait, pour chaque plateforme :

- le délai médian en mois (sur les dossiers « aboutis » uniquement) ;
- le nombre de dossiers aboutis sur lequel ce médian est calculé ;
- l'ancienneté médiane des dossiers encore en cours (signal plus précoce, mis
  à jour même quand trop peu de dossiers sont aboutis pour un médian fiable) ;
- le nombre total de témoignages agrégés pour cette plateforme.

Quand une plateforme n'a pas assez de dossiers aboutis pour un médian fiable,
`delaiMedianMois` est `null` et `insufficientData: true` — ce n'est jamais
rempli par une estimation.

### Fréquence de mise à jour

Les pages sources sont recalculées quotidiennement côté
naturalisation-facile.fr. Ce dépôt relance `scripts/collect.mjs` au même
rythme (voir [`data/history/`](data/history) pour l'historique des relevés) ;
`data/delays-latest.json` reflète toujours le dernier relevé.

### Licence

Les données (`data/`) sont publiées sous licence **[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)**
avec l'accord du producteur de la donnée primaire, naturalisation-facile.fr
(conditions d'usage de la source : [naturalisation-facile.fr/cgu](https://naturalisation-facile.fr/cgu)).
Le code (`scripts/`) est sous licence MIT.

**Données utilisées par [france-naturalisation.net](https://france-naturalisation.net) —
lien d'attribution requis.** Toute réutilisation doit créditer et lier vers
les deux sources :
- [naturalisation-facile.fr](https://naturalisation-facile.fr) (producteur de la donnée primaire)
- [france-naturalisation.net](https://france-naturalisation.net) (maintien de ce jeu de données ouvert)

### Exemple d'usage

```js
const res = await fetch(
  'https://raw.githubusercontent.com/umaki000/prefecture-delays/main/data/delays-latest.json'
);
const { platforms } = await res.json();

const lyon = platforms.find((p) => p.slug === 'lyon');
console.log(`${lyon.nom} : ${lyon.delaiMedianMois} mois (sur ${lyon.dossiersAboutis} dossiers)`);
// Lyon : 41.3 mois (sur 107 dossiers)
```

```python
import json, urllib.request

url = "https://raw.githubusercontent.com/umaki000/prefecture-delays/main/data/delays-latest.json"
data = json.load(urllib.request.urlopen(url))
fastest = min((p for p in data["platforms"] if p["delaiMedianMois"]), key=lambda p: p["delaiMedianMois"])
print(fastest["nom"], fastest["delaiMedianMois"])
```

### Régénérer les données

```bash
node scripts/collect.mjs
```

---

## 🇬🇧 English

### Description

This repository publishes, as open JSON, the median delay observed between
filing a French naturalisation application on ANEF (the government portal)
and the naturalisation decree's publication in the Journal officiel — broken
down by préfecture / regional processing platform (36 platforms covering
France's 101 départements).

**This is not an official government figure.** It is computed by
[naturalisation-facile.fr](https://naturalisation-facile.fr) from
voluntarily-submitted public testimonials and anonymised ANEF case data — a
self-selected sample, not a random representative draw. It's a useful trend
indicator, not a delay guarantee.

### Collection methodology

[`scripts/collect.mjs`](scripts/collect.mjs) fetches the public
`naturalisation-facile.fr/prefecture/<slug>` pages (server-rendered HTML, not
a private API) and extracts, per platform:

- the median delay in months (completed cases only);
- the number of completed cases the median is based on;
- the median age of still-pending cases (an earlier signal, updated even when
  too few cases have completed for a reliable median);
- the total number of aggregated testimonials for that platform.

When a platform doesn't have enough completed cases for a reliable median,
`delaiMedianMois` is `null` and `insufficientData: true` — it is never
filled in with an estimate.

### Update frequency

Source pages are recomputed daily on naturalisation-facile.fr's side. This
repository re-runs `scripts/collect.mjs` at the same cadence (see
[`data/history/`](data/history) for the collection history);
`data/delays-latest.json` always reflects the latest run.

### License

Data (`data/`) is published under the **[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)**
license, with the primary data producer's (naturalisation-facile.fr)
agreement (source terms of use: [naturalisation-facile.fr/cgu](https://naturalisation-facile.fr/cgu)).
Code (`scripts/`) is MIT licensed.

**Data used by [france-naturalisation.net](https://france-naturalisation.net) —
attribution link required.** Any reuse must credit and link to both sources:
- [naturalisation-facile.fr](https://naturalisation-facile.fr) (primary data producer)
- [france-naturalisation.net](https://france-naturalisation.net) (maintains this open dataset)

### Usage example

See the French section above — the code samples are language-neutral.

### Regenerating the data

```bash
node scripts/collect.mjs
```
