/* ------------------------------------------------------------------ */
/* Un code QR, fabriqué ici, sans rien appeler dehors                  */
/* ------------------------------------------------------------------ */
/* L'affiche est le seul support papier du produit. Elle porte un lien, et un
   lien de quarante-huit caractères recopié à la main au-dessus d'une machine à
   café n'est jamais recopié : c'est une affiche qu'on regarde, pas une affiche
   à laquelle on répond.

   Pourquoi l'écrire plutôt que de le prendre ailleurs. Les générateurs de codes
   QR en ligne fabriquent une image sur leur serveur : le lien d'inscription
   d'un client partirait chez un tiers à chaque impression, et l'affiche
   cesserait de s'imprimer le jour où ce tiers ferme. Une bibliothèque
   embarquée pèse plus que ce fichier et fait dix fois plus de choses que ce
   dont on a besoin.

   Ce qui est couvert : le mode octet, le niveau de correction M, les versions 1
   à 6, soit cent six caractères. Un lien Riseva en fait une cinquantaine. Au
   delà, `qrMatrice` rend `null` et l'affiche retombe sur le lien écrit en
   clair, qui reste lisible. Ce qui n'est pas couvert ne l'est pas à moitié :
   c'est refusé franchement, plutôt que rendu de travers. */

// Corps de Galois à 256 éléments, polynôme 0x11D, celui de la norme.
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x; LOG[x] = i;
    x <<= 1; if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

/* Le polynôme générateur de degré n, construit par produits successifs. */
function generateur(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const suivant = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      suivant[j] ^= g[j];
      suivant[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = suivant;
  }
  return g;
}

/* Les mots de correction d'un bloc : la division polynomiale de la norme. */
function correction(donnees, n) {
  const g = generateur(n);
  const r = donnees.concat(new Array(n).fill(0));
  for (let i = 0; i < donnees.length; i++) {
    const c = r[i];
    if (!c) continue;
    for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c);
  }
  return r.slice(donnees.length);
}

/* Versions 1 à 6, niveau M. Chaque version a ici des blocs de taille égale,
   ce qui évite tout le cas des groupes mixtes : au delà de la version 6 il
   faudrait le traiter, et on préfère refuser que le traiter à moitié. */
const VERSIONS = [
  { v: 1, ec: 10, blocs: 1, parBloc: 16, align: [] },
  { v: 2, ec: 16, blocs: 1, parBloc: 28, align: [6, 18] },
  { v: 3, ec: 26, blocs: 1, parBloc: 44, align: [6, 22] },
  { v: 4, ec: 18, blocs: 2, parBloc: 32, align: [6, 26] },
  { v: 5, ec: 24, blocs: 2, parBloc: 43, align: [6, 30] },
  { v: 6, ec: 16, blocs: 4, parBloc: 27, align: [6, 34] },
];

function bits(texte) {
  const octets = new TextEncoder().encode(texte);
  const spec = VERSIONS.find(s => s.blocs * s.parBloc * 8 - 12 >= octets.length * 8);
  if (!spec) return null;
  const total = spec.blocs * spec.parBloc;
  const b = [];
  const pousse = (val, n) => { for (let i = n - 1; i >= 0; i--) b.push((val >> i) & 1); };
  pousse(0b0100, 4);
  pousse(octets.length, 8);
  for (const o of octets) pousse(o, 8);
  for (let i = 0; i < 4 && b.length < total * 8; i++) b.push(0);
  while (b.length % 8) b.push(0);
  const mots = [];
  for (let i = 0; i < b.length; i += 8)
    mots.push(b.slice(i, i + 8).reduce((a, x) => (a << 1) | x, 0));
  const bourre = [0xec, 0x11];
  for (let i = 0; mots.length < total; i++) mots.push(bourre[i % 2]);
  return { spec, mots };
}

/* Les blocs sont entrelacés : un mot de chaque bloc, puis le suivant. C'est ce
   qui fait qu'une tache sur le papier abîme un peu tous les blocs au lieu d'en
   détruire un entièrement. */
function motsFinaux(spec, mots) {
  const blocs = [], ecs = [];
  for (let i = 0; i < spec.blocs; i++) {
    const d = mots.slice(i * spec.parBloc, (i + 1) * spec.parBloc);
    blocs.push(d); ecs.push(correction(d, spec.ec));
  }
  const out = [];
  for (let i = 0; i < spec.parBloc; i++) for (const d of blocs) out.push(d[i]);
  for (let i = 0; i < spec.ec; i++) for (const e of ecs) out.push(e[i]);
  return out;
}

const MASQUES = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
  (i, j) => (((i * j) % 2 + (i * j) % 3) % 2) === 0,
  (i, j) => (((i + j) % 2 + (i * j) % 3) % 2) === 0,
];

/* L'information de format : cinq bits, un BCH(15,5), puis un ou exclusif avec
   le motif de la norme. Sans ce dernier, un format tout à zéro produirait une
   zone uniforme qu'aucun lecteur ne retrouve. */
function format(masque) {
  let d = (0b00 << 3) | masque;          // 00 = niveau M
  let reste = d << 10;
  for (let i = 4; i >= 0; i--)
    if (reste & (1 << (i + 10))) reste ^= 0b10100110111 << i;
  return ((d << 10) | reste) ^ 0b101010000010010;
}

export function qrMatrice(texte) {
  const enc = bits(texte);
  if (!enc) return null;
  const { spec } = enc;
  const finaux = motsFinaux(spec, enc.mots);
  const n = 17 + spec.v * 4;
  const grille = Array.from({ length: n }, () => new Array(n).fill(null));

  const poser = (r, c, v) => { if (r >= 0 && c >= 0 && r < n && c < n) grille[r][c] = v; };
  const chercheur = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const dans = i >= 0 && i <= 6 && j >= 0 && j <= 6;
      const noir = dans && (i === 0 || i === 6 || j === 0 || j === 6 ||
                            (i >= 2 && i <= 4 && j >= 2 && j <= 4));
      poser(r + i, c + j, noir ? 1 : 0);
    }
  };
  chercheur(0, 0); chercheur(0, n - 7); chercheur(n - 7, 0);

  for (let i = 8; i < n - 8; i++) {          // les deux lignes de cadence
    grille[6][i] = i % 2 === 0 ? 1 : 0;
    grille[i][6] = i % 2 === 0 ? 1 : 0;
  }
  for (const r of spec.align) for (const c of spec.align) {
    if ((r === 6 && c === 6) || (r === 6 && c === spec.align[1]) ||
        (r === spec.align[1] && c === 6)) continue;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++)
      poser(r + i, c + j, (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) ? 1 : 0);
  }
  grille[n - 8][8] = 1;                       // le module toujours noir

  // Les emplacements du format sont réservés avant de poser les données.
  const reserve = [];
  for (let i = 0; i <= 8; i++) { if (i !== 6) reserve.push([8, i]); }
  for (let i = 0; i <= 8; i++) { if (i !== 6 && i !== 8) reserve.push([i, 8]); }
  for (let i = 0; i < 8; i++) reserve.push([8, n - 1 - i]);
  for (let i = 0; i < 7; i++) reserve.push([n - 1 - i, 8]);
  for (const [r, c] of reserve) if (grille[r][c] === null) grille[r][c] = 0;

  // Le parcours en zigzag, de bas à droite vers le haut, colonne 6 sautée.
  let bit = 0, montant = true;
  const flux = [];
  for (const m of finaux) for (let i = 7; i >= 0; i--) flux.push((m >> i) & 1);
  for (let i = 0; i < 7; i++) flux.push(0);   // bits restants, versions 2 à 6
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < n; k++) {
      const r = montant ? n - 1 - k : k;
      for (const c of [col, col - 1]) {
        if (grille[r][c] !== null) continue;
        grille[r][c] = flux[bit++] ?? 0;
        grille[r][c] |= 2;                    // marque : module de données
      }
    }
    montant = !montant;
  }

  const estDonnee = (r, c) => (grille[r][c] & 2) !== 0;
  const brut = grille.map(l => l.map(v => v & 1));

  const penalite = (m) => {
    let p = 0;
    for (let i = 0; i < n; i++) {
      for (const ligne of [m[i], m.map(l => l[i])]) {
        let run = 1;
        for (let j = 1; j < n; j++) {
          if (ligne[j] === ligne[j - 1]) { run++; }
          else { if (run >= 5) p += 3 + (run - 5); run = 1; }
        }
        if (run >= 5) p += 3 + (run - 5);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++)
      if (m[i][j] === m[i][j + 1] && m[i][j] === m[i + 1][j] &&
          m[i][j] === m[i + 1][j + 1]) p += 3;
    const motif = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const inverse = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let i = 0; i < n; i++) for (let j = 0; j + 11 <= n; j++) {
      const l = m[i].slice(j, j + 11), c = m.slice(j, j + 11).map(x => x[i]);
      for (const s of [l, c]) {
        if (motif.every((v, k) => s[k] === v)) p += 40;
        if (inverse.every((v, k) => s[k] === v)) p += 40;
      }
    }
    let noirs = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) noirs += m[i][j];
    p += Math.floor(Math.abs(noirs * 100 / (n * n) - 50) / 5) * 10;
    return p;
  };

  let meilleur = null, meilleurP = Infinity, meilleurM = 0;
  for (let k = 0; k < 8; k++) {
    const m = brut.map((l, r) => l.map((v, c) =>
      estDonnee(r, c) && MASQUES[k](r, c) ? v ^ 1 : v));
    /* Les quinze bits se lisent du plus significatif au moins significatif, et
       c'est le bit 14 qui tombe en (8,0). L'écrire dans l'autre sens produit un
       code parfaitement formé que personne ne lit : le motif est là, les
       données sont bonnes, et aucun téléphone ne s'accroche. */
    const f = format(k), bit = i => (f >> (14 - i)) & 1;
    for (let i = 0; i <= 5; i++) m[8][i] = bit(i);
    m[8][7] = bit(6); m[8][8] = bit(7); m[7][8] = bit(8);
    for (let i = 9; i <= 14; i++) m[14 - i][8] = bit(i);
    for (let i = 0; i <= 7; i++) m[n - 1 - i][8] = bit(i);
    for (let i = 8; i <= 14; i++) m[8][n - 15 + i] = bit(i);
    m[n - 8][8] = 1;
    const p = penalite(m);
    if (p < meilleurP) { meilleurP = p; meilleur = m; meilleurM = k; }
  }
  return meilleur;
}

/* Le rendu : un seul chemin SVG, donc une seule balise à insérer, et une image
   qui reste nette à n'importe quelle taille d'impression. La marge de quatre
   modules n'est pas décorative : sans elle, un lecteur ne trouve pas le code
   sur un fond de la même couleur. */
export function qrSvg(texte, taille = 160, alt = "") {
  const m = qrMatrice(texte);
  if (!m) return "";
  const n = m.length, marge = 4, c = n + marge * 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let j = 0; j < n; j++)
    if (m[r][j]) d += `M${j + marge} ${r + marge}h1v1h-1z`;
  return `<svg class="qr" width="${taille}" height="${taille}" viewBox="0 0 ${c} ${c}" ` +
    `role="img" aria-label="${alt || 'Code QR vers le lien d’inscription'}">` +
    `<rect width="${c}" height="${c}" fill="#fff"/>` +
    `<path d="${d}" fill="#131510"/></svg>`;
}
