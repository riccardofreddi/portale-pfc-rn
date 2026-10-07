#!/usr/bin/env node
/**
 * Portale PFC RN — versione successiva secondo la regola dell'app.
 *
 * v4.97: la numerazione segue questa politica:
 *   - la patch sale da 0 a 9   (1.87.8 -> 1.87.9)
 *   - la patch arriva a 9      -> rotola il minor (1.87.9 -> 1.88.0)
 *   - il major NON si tocca mai da qui (si decide a mano).
 *
 * Storia: la prima stesura guardava il MINOR nella condizione di rotola
 * ("b >= 9") e con b = 87 la condizione scattava SEMPRE: da 1.87.8
 * produceva 1.88.0 saltando 1.87.9. La condizione giusta guarda la
 * PATCH (c >= 9).
 *
 * Uso:
 *   node scripts/bump-version.cjs              # legge la versione da package.json
 *   node scripts/bump-version.cjs 1.87.8       # versione passata a mano
 *
 * Stampa solo la versione successiva (niente file toccati: il bump dei
 * 4 file resta manuale e voluto, cosi' lo script non puo' rompere nulla).
 */
const fs = require('fs');
const path = require('path');

const arg = process.argv[2];
let versione = arg;
if (!versione) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  versione = pkg.version;
}

const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(versione).trim());
if (!m) {
  console.error(`Versione non valida: "${versione}" (atteso x.y.z)`);
  process.exit(1);
}

const a = Number(m[1]);
const b = Number(m[2]);
const c = Number(m[3]);

// v4.97: la rotola guarda la PATCH (c), non il minor (b)
const successiva = c >= 9 ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
console.log(successiva);
