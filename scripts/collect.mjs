#!/usr/bin/env node
// Collects the per-platform naturalisation delay figures that
// naturalisation-facile.fr publishes on each of its 36 "prefecture/<slug>"
// pages (server-rendered JSON-LD description, not a private API) and writes
// data/delays-latest.json + a dated snapshot under data/history/.
//
// Run from this directory: `node scripts/collect.mjs`
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const BASE_URL = 'https://naturalisation-facile.fr';

const DESCRIPTION_RE =
  /Délai médian du dépôt au décret \(dossiers aboutis\) ?: ?([0-9]+(?:[.,][0-9]+)?) mois sur ([0-9]+) dossiers\. Ancienneté médiane des dossiers observés \(toutes étapes confondues\) ?: ?([0-9]+(?:[.,][0-9]+)?) mois\. Source ?: ?naturalisation-facile\.fr, dernière mise à jour ([0-9-]+ [0-9:]+)/;
const LOW_DATA_RE =
  /Ancienneté médiane des dossiers observés \(toutes étapes confondues\) ?: ?([0-9]+(?:[.,][0-9]+)?) mois\. Source ?: ?naturalisation-facile\.fr, dernière mise à jour ([0-9-]+ [0-9:]+)/;
const TEMOIGNAGES_RE = /sur ([0-9 ]+) témoignages publics agrégés/;

function extractBalanced(s, startIdx, openCh, closeCh) {
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    if (s[i] === openCh) depth++;
    else if (s[i] === closeCh) {
      depth--;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

function extractJsonConst(html, key) {
  const idx = html.indexOf(`"${key}":`);
  if (idx === -1) return null;
  const start = html.indexOf('{', idx + key.length + 3);
  const blob = extractBalanced(html, start, '{', '}');
  return blob ? JSON.parse(blob) : null;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (prefecture-delays-collector; +https://github.com/<org>/prefecture-delays)' },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function parsePlatformHtml(html) {
  let m = DESCRIPTION_RE.exec(html);
  if (m) {
    return {
      delaiMedianMois: Number(m[1].replace(',', '.')),
      dossiersAboutis: Number(m[2]),
      ancienneteMedianeMois: Number(m[3].replace(',', '.')),
      derniereMajSource: m[4],
      insufficientData: false,
    };
  }
  m = LOW_DATA_RE.exec(html);
  if (m) {
    return {
      delaiMedianMois: null,
      dossiersAboutis: null,
      ancienneteMedianeMois: Number(m[1].replace(',', '.')),
      derniereMajSource: m[2],
      insufficientData: true,
    };
  }
  return null;
}

async function main() {
  const indexHtml = await fetchHtml(`${BASE_URL}/prefectures`);
  const meta = extractJsonConst(indexHtml, 'PLATFORM_META'); // { slug: { nom, dep_chef } }
  const deps = extractJsonConst(indexHtml, 'PLATFORMS'); // { slug: [codeDept, ...] }
  if (!meta || !deps) throw new Error('Could not find PLATFORM_META/PLATFORMS on the index page — site markup may have changed.');

  const slugs = Object.keys(meta).sort();
  const platforms = [];
  for (const slug of slugs) {
    const html = await fetchHtml(`${BASE_URL}/prefecture/${slug}`);
    const tm = TEMOIGNAGES_RE.exec(html);
    const parsed = parsePlatformHtml(html);
    if (!parsed) {
      console.warn(`[collect] no delay data found for "${slug}" — skipping`);
      continue;
    }
    platforms.push({
      slug,
      nom: meta[slug].nom,
      departementChefLieu: meta[slug].dep_chef,
      departements: deps[slug] ?? [],
      temoignagesTotal: tm ? Number(tm[1].replace(/\s/g, '')) : null,
      ...parsed,
    });
    // Politeness delay — this is someone's production server, not a bulk API.
    await new Promise((r) => setTimeout(r, 400));
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'naturalisation-facile.fr',
    sourceUrl: `${BASE_URL}/prefectures`,
    methodology:
      "Délai médian entre le dépôt du dossier sur l'ANEF et le décret de naturalisation au Journal officiel, calculé sur les dossiers aboutis suivis par témoignage public volontaire (pas un échantillon aléatoire). 'insufficientData: true' signale une plateforme avec trop peu de dossiers aboutis pour un médian fiable : seule l'ancienneté médiane des dossiers en cours est alors fournie.",
    platformCount: platforms.length,
    departmentCount: platforms.reduce((n, p) => n + p.departements.length, 0),
    platforms,
  };

  await mkdir(path.join(DATA_DIR, 'history'), { recursive: true });
  const json = JSON.stringify(out, null, 2) + '\n';
  await writeFile(path.join(DATA_DIR, 'delays-latest.json'), json, 'utf-8');
  const dateStamp = out.generatedAt.slice(0, 10);
  await writeFile(path.join(DATA_DIR, 'history', `${dateStamp}.json`), json, 'utf-8');

  console.log(`[collect] wrote ${platforms.length} platforms (${out.departmentCount} départements) -> data/delays-latest.json`);
}

main().catch((err) => {
  console.error('[collect] failed:', err);
  process.exitCode = 1;
});
