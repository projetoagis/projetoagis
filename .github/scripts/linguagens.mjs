import fs from 'node:fs';

const USUARIO = process.env.USUARIO || 'projetoagis';
const MAX = 8;
const TOKEN = process.env.GITHUB_TOKEN || '';

const CORES = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c',
  Java: '#b07219', 'C#': '#178600', PHP: '#4F5D95', Shell: '#89e051', PowerShell: '#012456',
  Go: '#00ADD8', Rust: '#dea584', Kotlin: '#A97BFF', Dart: '#00B4AB', Vue: '#41b883',
  'Jupyter Notebook': '#DA5B0B', SQL: '#e38c00', Ruby: '#701516', C: '#555555', 'C++': '#f34b7d',
};

async function api(url) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const repos = (await api(`https://api.github.com/users/${USUARIO}/repos?per_page=100&type=owner`))
  .filter(r => !r.fork && !r.archived && !r.private);

const total = new Map();
for (const r of repos) {
  const l = await api(r.languages_url);
  for (const [nome, bytes] of Object.entries(l)) total.set(nome, (total.get(nome) || 0) + bytes);
}

const soma = [...total.values()].reduce((a, b) => a + b, 0) || 1;
const top = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX)
  .map(([nome, bytes]) => ({ nome, pct: (bytes / soma) * 100, cor: CORES[nome] || '#8b949e' }));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const L = 340, M = 20, barraL = L - 2 * M;
const linhas = Math.ceil(top.length / 2);
const A = 70 + linhas * 22;

let x = M;
const barra = top.map(t => {
  const w = (t.pct / 100) * barraL;
  const r = `<rect x="${x.toFixed(2)}" y="44" width="${Math.max(w, 0.5).toFixed(2)}" height="8" fill="${t.cor}"/>`;
  x += w;
  return r;
}).join('');

const legenda = top.map((t, i) => {
  const cx = M + (i % 2) * (barraL / 2);
  const cy = 74 + Math.floor(i / 2) * 22;
  return `<circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${t.cor}"/>`
    + `<text x="${cx + 16}" y="${cy}" class="t">${esc(t.nome)} <tspan class="p">${t.pct.toFixed(1).replace('.', ',')}%</tspan></text>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}" viewBox="0 0 ${L} ${A}" role="img" aria-label="Linguagens mais usadas">
<style>
.h{font:600 15px 'Segoe UI',Ubuntu,Helvetica,Arial,sans-serif;fill:#0b57a4}
.t{font:400 12px 'Segoe UI',Ubuntu,Helvetica,Arial,sans-serif;fill:#24292f}
.p{fill:#57606a}
</style>
<rect x="0.5" y="0.5" width="${L - 1}" height="${A - 1}" rx="6" fill="#ffffff" stroke="#d0d7de"/>
<text x="${M}" y="30" class="h">Linguagens mais usadas</text>
<clipPath id="c"><rect x="${M}" y="44" width="${barraL}" height="8" rx="4"/></clipPath>
<g clip-path="url(#c)">${barra}</g>
${legenda}
</svg>
`;

fs.writeFileSync('linguagens.svg', svg);
console.log(top.map(t => `${t.nome} ${t.pct.toFixed(1)}%`).join(' | '));
