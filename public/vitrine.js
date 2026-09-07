/* Riseva, vitrines : le script des deux pages publiques.

   Ce qu'il fait, et rien d'autre : la barre qui prend un filet quand la page a
   defile ; le menu sous 900 px, qui est un <dialog> ; la riviere qui se trace
   quand le mecanisme entre a l'ecran ; le simulateur de tarif, qui lit la
   grille dans la page ; la phrase a trous de la page associations, qui verifie
   les quatre reponses, les depose et emmene dans l'application.

   Ce qu'il ne fait pas, et c'est voulu : aucune apparition au defilement,
   aucun texte qui attend un script pour s'afficher. Sans lui, les deux pages
   sont completes, la barre est une barre et les ancres marchent.

   Ecrit en JavaScript sans modules ni compilation : c'est un fichier, servi
   tel quel, lisible tel quel. Aucun tiret cadratin ni apostrophe courbe dans
   les chaines affichees : la recette clavier.py les mesure sur le rendu.     */
(function () {
  'use strict';
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var moins = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. La barre ─────────────────────────────────────────────────── */
  var nav = qs('#nav');
  if (nav) {
    var etat = null;
    var poser = function () {
      var d = (window.scrollY || document.documentElement.scrollTop) > 8;
      if (d !== etat) { etat = d; nav.classList.toggle('est-defile', d); }
    };
    poser();
    addEventListener('scroll', poser, { passive: true });
  }

  /* ── 2. Le menu ───────────────────────────────────────────────────
     Un <dialog> modal : le navigateur gere le focus, Echap et le fond
     inerte. Un clic sur un lien du menu le ferme avant de suivre l'ancre ;
     un clic en dehors du panneau le ferme aussi. */
  var menu = qs('#menu'), ouvrir = qs('#navMenu'), fermer = qs('#menuClose');
  if (menu && ouvrir && typeof menu.showModal === 'function') {
    ouvrir.addEventListener('click', function () {
      menu.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
    var clore = function () { if (menu.open) menu.close(); };
    if (fermer) fermer.addEventListener('click', clore);
    qsa('a', menu).forEach(function (a) { a.addEventListener('click', clore); });
    menu.addEventListener('click', function (e) {
      var r = qs('.menu-in', menu).getBoundingClientRect();
      var dehors = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (dehors) clore();
    });
    menu.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
      ouvrir.focus();
    });
  } else if (ouvrir) {
    /* Sans <dialog> (navigateur ancien) : le bouton renvoie au pied de page,
       ou toutes les entrees existent. */
    ouvrir.addEventListener('click', function () { location.hash = '#pied'; });
  }

  /* ── 3. La riviere ────────────────────────────────────────────────
     Le trait se trace une fois, quand la bande des moments entre a l'ecran.
     Sans IntersectionObserver, ou si le visiteur a demande moins de
     mouvement, il est deja trace (voir la feuille). */
  var riv = qs('.riviere');
  if (riv && !moins && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { riv.classList.add('on'); obs.disconnect(); }
      });
    }, { threshold: 0.4 });
    obs.observe(riv);
  } else if (riv) {
    riv.classList.add('on');
  }

  /* ── 4. Le simulateur ─────────────────────────────────────────────
     Le meme calcul que la plateforme (devisPour dans data.js), ecrit une
     fois ici et lu depuis la grille rendue dans la page : deux formules du
     meme prix a deux endroits, ce sont deux prix differents au premier
     changement de grille. La recette compare le resultat au moteur de devis. */
  (function () {
    var eff = qs('#simEff'), sites = qs('#simSites'), out = qs('#simOut');
    if (!eff || !sites || !out) return;
    var nb = function (s) { return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0; };
    var paliers = qsa('#prix .tar-t tbody tr').map(function (tr) {
      var lib = tr.children[0].textContent;
      var m = lib.match(/(\d[\d\s]*)\s*(?:à|a)\s*(\d[\d\s]*)/);
      var max = m ? nb(m[2]) : (/Moins de/.test(lib) ? nb(lib) - 1 : Infinity);
      return { max: max, prix: nb(tr.children[1].querySelector('b').textContent),
               sites: nb(tr.children[2].textContent) };
    });
    var supp = (function () {
      var m = (qs('#prix .tar-n b') || {}).textContent || '';
      return nb(m);
    })();
    var eur = function (n) { return n.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €'; };
    var minuteur = null;
    function maj() {
      /* Un champ vide pendant qu'on retape un nombre ne produit pas de phrase :
         on garde le resultat precedent. */
      if (!String(eff.value).trim()) return;
      var plafond = parseInt(eff.max, 10) || Infinity;
      var e = Math.min(plafond, Math.max(1, parseInt(eff.value, 10) || 1));
      var s = Math.max(1, parseInt(sites.value, 10) || 1);
      var p = null;
      for (var i = 0; i < paliers.length; i++) { if (e <= paliers[i].max) { p = paliers[i]; break; } }
      if (!p) p = paliers[paliers.length - 1];
      var facturables = Math.max(0, s - p.sites);
      var base = p.prix + facturables * supp;
      var ht = base - Math.round(base * 0.10);
      var acompte = Math.min(ht, Math.max(900, Math.round(ht * 0.40)));
      var html;
      if (p.max === Infinity) {
        /* La derniere tranche est sur devis : la grille le dit, le simulateur
           ne repond pas un montant ferme inferieur au plancher affiche. */
        html = 'À partir de <b>' + eur(p.prix) + ' HT</b> la saison. Au-delà de deux mille '
             + 'salariés, le tarif est établi sur devis, sites compris'
             + (facturables ? ' : vous en déclarez ' + s + '.' : '.');
      } else {
        /* Pas de division par salarie a cote du montant : le heros dit « rien
           par salarie », et un prix ramene a la tete fabriquerait l'ambiguite. */
        html = '<b>' + eur(ht) + ' HT</b> la saison au tarif fondateur. Acompte de <b>'
             + eur(acompte) + '</b> à la commande'
             + (facturables ? ', dont ' + facturables + ' site' + (facturables > 1 ? 's' : '')
                              + ' au-delà de ceux compris' : '')
             + '.';
      }
      out.innerHTML = html;
      if (!moins) {
        out.classList.remove('maj');
        clearTimeout(minuteur);
        minuteur = setTimeout(function () { out.classList.add('maj'); }, 10);
      }
    }
    eff.addEventListener('input', maj);
    sites.addEventListener('input', maj);
    maj();
  })();

  /* ── 5. La phrase a trous ─────────────────────────────────────────
     Quatre champs dans une phrase. Chaque champ a son <label> pour le lecteur
     d'ecran et sa largeur suit son contenu. A l'envoi, les quatre reponses
     sont deposees pour l'application,
     qui cree l'espace et emmene dans le dossier a completer. Si le depot
     echoue (stockage bloque), la demande part par courriel : rien n'est
     annonce qui n'ait eu lieu. */
  (function () {
    var form = qs('#formAsso'); if (!form) return;
    var inputs = qsa('.bk', form);
    var hint = qs('#jHint'), msg = qs('#jMsg');
    var HINTS = {
      asso: 'Le nom exact, celui du Journal officiel si vous l\'avez sous la main.',
      ville: 'Pour vous montrer aux entreprises proches de chez vous.',
      mot: 'Des bras une demi-journée, du matériel précis. Le plus concret possible.',
      mail: 'C\'est à cette adresse que le lien de connexion arrive.'
    };
    var BASE = hint ? hint.textContent : '';

    /* La ligne d'aide garde la hauteur du plus long des messages : sinon le
       bouton descend au moment ou l'on appuie, et le clic ne compte pas. */
    function reserver() {
      if (!hint) return;
      var garde = hint.textContent, classe = hint.className;
      hint.style.minHeight = ''; hint.className = 'j-hint'; hint.textContent = BASE;
      var h = hint.getBoundingClientRect().height;
      for (var k in HINTS) { if (HINTS.hasOwnProperty(k)) {
        hint.textContent = HINTS[k]; h = Math.max(h, hint.getBoundingClientRect().height); } }
      hint.textContent = garde; hint.className = classe;
      hint.style.minHeight = Math.ceil(h) + 'px';
    }
    reserver();
    var tRes = null;
    addEventListener('resize', function () { clearTimeout(tRes); tRes = setTimeout(reserver, 150); });

    /* La largeur du champ suit son contenu, ou son placeholder tant qu'il est
       vide. Le fantome mesure ; le champ lui-meme confirme, parce qu'il est le
       seul a savoir ce qu'il dessine, et un placeholder trop long est coupe en
       silence. */
    function mesurer(inp) {
      var g = inp.parentNode.querySelector('.ghost');
      if (!g) return;
      var txt = inp.value || inp.placeholder || '';
      g.textContent = txt;
      inp.style.setProperty('--w', (g.getBoundingClientRect().width + 16) + 'px');
      var besoin;
      if (inp.value) { besoin = inp.scrollWidth; }
      else { inp.value = txt; besoin = inp.scrollWidth; inp.value = ''; }
      if (besoin > inp.clientWidth) inp.style.setProperty('--w', (besoin + 16) + 'px');
    }
    function valide(inp) {
      var v = inp.value.trim();
      if (!v) return false;
      if (inp.dataset.key === 'mail') return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
      return v.length > 1;
    }
    inputs.forEach(function (inp) {
      mesurer(inp);
      inp.addEventListener('input', function () {
        mesurer(inp);
        inp.classList.remove('bad');
        if (hint) hint.classList.remove('bad');
      });
      inp.addEventListener('focus', function () {
        if (hint && !hint.classList.contains('bad')) hint.textContent = HINTS[inp.dataset.key] || BASE;
      });
      inp.addEventListener('blur', function () {
        if (!inp.value.trim()) { inp.classList.remove('ok', 'bad'); return; }
        var ok = valide(inp);
        inp.classList.toggle('ok', ok);
        inp.classList.toggle('bad', !ok);
        if (!hint) return;
        if (!ok) {
          hint.classList.add('bad');
          hint.textContent = inp.dataset.key === 'mail'
            ? 'Cette adresse ne semble pas complète. Exemple : prenom.nom@exemple.fr'
            : 'Vérifiez ' + inp.dataset.label + '.';
        } else { hint.classList.remove('bad'); hint.textContent = BASE; }
      });
    });
    addEventListener('resize', function () { inputs.forEach(mesurer); }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { inputs.forEach(mesurer); });
    }

    function valeurs() {
      var d = {};
      inputs.forEach(function (i) { d[i.dataset.key] = i.value.trim(); });
      return d;
    }
    function courriel(d) {
      var corps = 'Association : ' + d.asso + '\nVille : ' + d.ville
                + '\nCe qui nous manque : ' + d.mot + '\nContact : ' + d.mail;
      return 'mailto:contact@riseva.fr?subject=' + encodeURIComponent('Riseva, une association vous écrit')
           + '&body=' + encodeURIComponent(corps);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var mauvais = inputs.filter(function (i) { return !valide(i); });
      if (mauvais.length) {
        mauvais.forEach(function (i) { i.classList.add('bad'); });
        msg.className = 'j-msg bad';
        msg.textContent = mauvais[0].value.trim()
          ? 'Vérifiez ' + mauvais[0].dataset.label + '.'
          : 'Il manque ' + mauvais[0].dataset.label + '.';
        mauvais[0].focus();
        return;
      }
      var d = valeurs();
      /* On verifie que le depot a eu lieu avant de partir : navigation privee
         ou stockage bloque, et la presidente arriverait sur un ecran de
         connexion, ses quatre reponses perdues. */
      var pose = false;
      try {
        localStorage.setItem('riseva.nouvelleAsso', JSON.stringify(d));
        pose = localStorage.getItem('riseva.nouvelleAsso') !== null;
      } catch (err) { pose = false; }
      if (!pose) {
        msg.className = 'j-msg';
        msg.innerHTML = 'Votre navigateur empêche l\'ouverture directe de l\'espace. Votre demande '
          + 'est prête, il ne manque qu\'un clic pour l\'envoyer depuis votre messagerie. '
          + '<a href="' + courriel(d) + '">Ouvrir mon courrier</a>';
        return;
      }
      msg.className = 'j-msg ok';
      msg.textContent = 'Un instant, on vous emmène...';
      location.href = '/app/';
    });
  })();
})();
