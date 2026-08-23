/* ------------------------------------------------------------------ */
/* Un vrai classeur, fabriqué ici, sans bibliothèque                   */
/* ------------------------------------------------------------------ */
/* Un responsable RSE qui reçoit un CSV le rouvre dans un tableur, corrige les
   séparateurs, refait les en-têtes, et perd le quart d'heure qu'on lui avait
   promis. Ce qu'il veut, c'est le classeur déjà fait : un onglet par rubrique,
   les sites en lignes, les indicateurs en colonnes, et les définitions à côté.

   Pourquoi l'écrire plutôt que de prendre une bibliothèque. Les bibliothèques
   de tableur pèsent de trois cents kilooctets à un mégaoctet, et il faudrait
   soit les servir depuis un domaine tiers, soit les embarquer dans le paquet :
   la première est exclue par la règle du zéro appel extérieur, la seconde
   triplerait le poids du fichier autonome. Celui-ci ne fait qu'une chose.

   Le format. Un `.xlsx` est une archive ZIP qui contient du XML. Elle est
   écrite ici en mode STOCKÉ, sans compression : cela évite de dépendre de
   `CompressionStream`, qui n'existe pas partout, et un rapport de collecte pèse
   quelques dizaines de kilooctets de toute façon. Excel, LibreOffice et Numbers
   lisent une archive stockée exactement comme une archive compressée.

   Ce qui est délibérément absent : les formules, les graphiques, la mise en
   forme conditionnelle. Le classeur est une restitution, pas un tableau de
   bord. Celui qui le reçoit en fait ce qu'il veut, et c'est tout l'intérêt. */

const enc = new TextEncoder();

/* CRC-32, la somme de contrôle que réclame l'en-tête ZIP. La table est calculée
   une fois : sans elle, un fichier de cent kilooctets prend une seconde. */
const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(octets) {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* Le XML n'accepte ni esperluette ni chevron, et un libellé d'indicateur en
   contient tôt ou tard. Les caractères de contrôle sont retirés en même temps :
   un caractère invisible venu d'un copier-coller casse le fichier à l'ouverture,
   et le message d'Excel ne dit pas où. */
const CONTROLES = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

function xml(v) {
  return String(v == null ? "" : v)
    .replace(CONTROLES, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const colonne = (n) => {
  let s = "";
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = ((n - r) / 26) | 0; }
  return s;
};

/* Une feuille. Les nombres partent en numérique, le reste en chaîne littérale :
   une valeur écrite en texte dans une colonne de nombres ne s'additionne pas, et
   c'est le premier reproche qu'on fait à un export. */
function feuille(lignes) {
  const rows = lignes.map((cells, r) => {
    const tds = cells.map((v, c) => {
      const ref = colonne(c) + (r + 1);
      if (v === null || v === undefined || v === "") return "";
      if (typeof v === "number" && Number.isFinite(v))
        return `<c r="${ref}"><v>${v}</v></c>`;
      const styl = r === 0 ? ' s="1"' : "";
      return `<c r="${ref}" t="inlineStr"${styl}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${tds}</row>`;
  }).join("");
  const large = Math.max(1, ...lignes.map(l => l.length));
  const cols = '<cols><col min="1" max="1" width="34" customWidth="1"/>'
    + `<col min="2" max="${large}" width="17" customWidth="1"/></cols>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

/* Excel refuse un nom d'onglet de plus de trente et un caractères, ou contenant
   l'un des cinq caractères réservés, et il le refuse en silence : le classeur
   s'ouvre vide, sans un mot d'explication. */
function nomOnglet(nom, pris) {
  let n = String(nom).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Feuille";
  let i = 2;
  while (pris.has(n.toLowerCase())) n = (n.slice(0, 28) + " " + i++).slice(0, 31);
  pris.add(n.toLowerCase());
  return n;
}

function zip(fichiers) {
  const morceaux = [], entrees = [];
  let offset = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const { nom, contenu } of fichiers) {
    const d = enc.encode(contenu), n = enc.encode(nom), c = crc32(d);
    const entete = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(c), ...u32(d.length), ...u32(d.length),
      ...u16(n.length), ...u16(0)
    ]);
    morceaux.push(entete, n, d);
    entrees.push({ nom: n, crc: c, taille: d.length, offset });
    offset += entete.length + n.length + d.length;
  }
  const debutCentral = offset;
  for (const e of entrees) {
    const central = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(e.crc), ...u32(e.taille), ...u32(e.taille),
      ...u16(e.nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(e.offset)
    ]);
    morceaux.push(central, e.nom);
    offset += central.length + e.nom.length;
  }
  morceaux.push(new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0),
    ...u16(entrees.length), ...u16(entrees.length),
    ...u32(offset - debutCentral), ...u32(debutCentral), ...u16(0)
  ]));
  return new Blob(morceaux, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* `onglets` : [{ nom, lignes }], la première ligne servant d'en-tête. */
export function classeur(onglets) {
  const pris = new Set();
  const noms = onglets.map(o => nomOnglet(o.nom, pris));
  const feuilles = onglets.map((o, i) => ({
    nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: feuille(o.lignes) }));
  const rels = onglets.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  const over = onglets.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return zip([
    { nom: "[Content_Types].xml", contenu:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${over}</Types>` },
    { nom: "_rels/.rels", contenu:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { nom: "xl/workbook.xml", contenu:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${noms.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>` },
    { nom: "xl/_rels/workbook.xml.rels", contenu:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels}<Relationship Id="rId${onglets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    /* Deux styles, et deux seulement : le normal, et l'en-tête en gras. Un
       classeur de restitution n'a pas à imposer une charte à celui qui le
       reçoit ; il a juste besoin que sa première ligne se distingue.
       `cellStyles` déclare le style « Normal ». Sans lui le fichier s'ouvre
       quand même, mais les lecteurs stricts avertissent qu'il n'a pas de style
       par défaut — un avertissement à l'ouverture suffit à faire douter de tout
       le reste du document. */
    { nom: "xl/styles.xml", contenu:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>` },
    ...feuilles
  ]);
}

/* Le téléchargement. Un `Blob` et un lien : rien ne part sur le réseau, le
   fichier est fabriqué dans l'onglet de celui qui le demande. */
export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
