
(function(){
'use strict';

var doc=document, root=doc.documentElement;
var qs=function(s,c){return (c||doc).querySelector(s);};
var qsa=function(s,c){return Array.prototype.slice.call((c||doc).querySelectorAll(s));};
var soft=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ─────────── 1. REVEALS ───────────
   Une seule observation, coupée dès que l'élément est vu.        */
var io=null;
if('IntersectionObserver' in window && !soft){
  io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  },{rootMargin:'0px 0px -9% 0px',threshold:.06});
  qsa('.rv,.rl').forEach(function(el){io.observe(el);});
}else{
  qsa('.rv,.rl').forEach(function(el){el.classList.add('in');});
}

/* ─────────── 2. NAV ─────────── */
var nav=qs('#nav');
var navLinks=qsa('.nav-links a');
var sections=navLinks.map(function(a){return qs(a.getAttribute('href'));}).filter(Boolean);

function onScrollNav(){
  var y=window.scrollY||root.scrollTop;
  nav.classList.toggle('on', y>24);

  var cur=null, mid=y+window.innerHeight*0.34;
  for(var i=0;i<sections.length;i++){
    var s=sections[i];
    if(s.offsetTop<=mid) cur=navLinks[i];
  }
  navLinks.forEach(function(a){
    if(a===cur) a.setAttribute('aria-current','true');
    else a.removeAttribute('aria-current');
  });
}
addEventListener('scroll',onScrollNav,{passive:true});
onScrollNav();

/* ─────────── 3. TITRE ─────────── */
var h1=qs('#h1');
if(h1){ requestAnimationFrame(function(){ setTimeout(function(){h1.classList.add('in');},90); }); }

/* ─────────── 4. CLASSEMENT ───────────
   Les lignes partent de leur rang de la semaine précédente et
   glissent vers le nouveau. Rien d'autre ne bouge.              */


/* ─────────── 5. CLÉ EN MAIN ───────────
   Accordeon d'images : le panneau survole s'ouvre, les autres
   se resserrent. Au tactile, un appui suffit. Sur les cartes
   data-pan="y", le curseur fait defiler la photo portrait.   */
(function(){
  var row=qs('.expand-row'); if(!row) return;
  var cards=qsa('.xcard',row);
  var isTouch=matchMedia('(hover:none),(max-width:900px)').matches;

  function open(card){
    cards.forEach(function(c){ c.classList.toggle('is-open', c===card); });
  }
  if(isTouch){
    cards.forEach(function(c){ c.addEventListener('click',function(){open(c);}); });
  }else{
    cards.forEach(function(c){
      c.addEventListener('mouseenter',function(){open(c);});
      c.addEventListener('focus',function(){open(c);});
    });
    row.addEventListener('mouseleave',function(){ open(cards[0]); });
  }

  cards.filter(function(c){return c.dataset.pan==='y';}).forEach(function(c){
    var img=qs('.kit-shot',c); if(!img) return;
    c.addEventListener('mousemove',function(e){
      var r=c.getBoundingClientRect();
      var pct=Math.min(100,Math.max(0,((e.clientY-r.top)/r.height)*100));
      img.style.objectPosition='center '+pct.toFixed(1)+'%';
    });
    c.addEventListener('mouseleave',function(){ img.style.objectPosition='center top'; });
  });
})();

/* ─────────── 5bis. LIGNE DE SAISON ───────────
   La courbe se dessine et les quatre reperes s'allument
   quand la section entre dans l'ecran, une seule fois.     */
(function(){
  var sais=qs('.sais'); if(!sais) return;
  if(soft || !('IntersectionObserver' in window)){ sais.classList.add('on'); return; }
  var so=new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(!e.isIntersecting) return;
      sais.classList.add('on');
      so.unobserve(e.target);
    });
  },{rootMargin:'0px 0px -14% 0px',threshold:.12});
  so.observe(sais);
})();


/* ─────────── 5ter. PARALLAXE DE LA PHOTO ───────────
   La couche defile nettement plus vite que la page : c'est ce
   decalage de vitesse qui donne la sensation que la photo est
   derriere le site, vue au travers d'une decoupe. On recalcule
   a chaque image tant que la page bouge, puis on s'arrete.   */
(function(){
  var layers=qsa('.sp-layer');
  /* la mosaique : chaque colonne porte sa propre amplitude, et on se
     repere sur la grille entiere (non collante) pour que le decalage
     continue d'evoluer meme quand le cadre est fige en sticky */
  var shifts=qsa('.mos-shift').map(function(el){
    return {el:el, amp:-130, ref:el.closest('.ret-mosaic')};
  });
  if((!layers.length && !shifts.length) || soft) return;

  function step(){
    var vh=innerHeight;
    for(var i=0;i<layers.length;i++){
      var l=layers[i], r=l.parentElement.getBoundingClientRect();
      if(r.bottom<-320 || r.top>vh+320) continue;
      var prog=(r.top + r.height/2 - vh/2)/vh;
      l.style.transform='translate3d(0,'+(prog*190).toFixed(1)+'px,0)';
    }
    for(var k=0;k<shifts.length;k++){
      var sh=shifts[k]; if(!sh.ref) continue;
      var q=sh.ref.getBoundingClientRect();
      if(q.bottom<-200 || q.top>vh+200) continue;
      var p=(q.top + q.height/2 - vh/2)/vh;
      p = p<-1.6?-1.6:(p>1.6?1.6:p);
      sh.el.style.transform='translate3d(0,'+(p*sh.amp).toFixed(1)+'px,0)';
    }
  }
  var raf=null, lastY=-1, idle=0;
  function loop(){
    step();
    var y=window.scrollY||0;
    if(y!==lastY){lastY=y;idle=0;}else idle++;
    raf = idle<14 ? requestAnimationFrame(loop) : null;
  }
  function kick(){ idle=0; if(!raf) raf=requestAnimationFrame(loop); }
  addEventListener('scroll',kick,{passive:true});
  addEventListener('resize',kick,{passive:true});
  step();
})();

/* ─────────── 6. FAQ ───────────
   Sommaire a gauche, reponse a cote. Les fleches haut et bas
   parcourent la liste, comme un vrai sommaire.            */
(function(){
  var idx=qs('#qaIndex'), panel=qs('#qaPanel');
  if(!idx||!panel) return;
  var links=qsa('.qa-link',idx), cards=qsa('.qa-card',panel);

  /* Sous mille pixels, la liste des questions passe AU-DESSUS du panneau des
     reponses, et le panneau garde la hauteur de la plus longue reponse. La
     reponse s'echangeait donc sept cents a mille cent pixels plus bas, hors du
     champ de vision, et la page ne bougeait pas : au telephone, on appuyait sur
     une question, puis sur la suivante, et il ne se passait RIEN a l'ecran. Dix
     questions sur la page d'accueil, sept sur celle des associations : la
     section entiere etait morte sur mobile.

     On amene donc la reponse sous les yeux. Sur grand ecran, ou les deux
     colonnes sont cote a cote, on ne touche a rien. */
  var etroit = function(){
    return window.matchMedia && window.matchMedia('(max-width:1000px)').matches;
  };

  function open(i, montrer){
    links.forEach(function(l,k){
      var on=k===i;
      l.classList.toggle('is-on',on);
      l.setAttribute('aria-selected',on?'true':'false');
    });
    cards.forEach(function(c,k){
      var on=k===i;
      c.classList.toggle('is-on',on);
      if(on) c.removeAttribute('hidden'); else c.setAttribute('hidden','');
    });
    if(montrer && etroit()){
      try { panel.scrollIntoView({ behavior:'smooth', block:'start' }); }
      catch(e){ panel.scrollIntoView(); }
    }
  }

  links.forEach(function(l,i){
    l.addEventListener('click',function(){ open(i,true); });
    l.addEventListener('keydown',function(e){
      var n=null;
      if(e.key==='ArrowDown'||e.key==='ArrowRight') n=(i+1)%links.length;
      if(e.key==='ArrowUp'||e.key==='ArrowLeft') n=(i-1+links.length)%links.length;
      if(e.key==='Home') n=0;
      if(e.key==='End') n=links.length-1;
      if(n===null) return;
      e.preventDefault(); open(n,true); links[n].focus();
    });
  });
})();

/* ─────────── 7. CONFLUENT ───────────
   Les mots sont déjà dans le HTML : on ne fait que les cadencer,
   pour que rien ne dépende du JavaScript pour être lisible.     */
(function(){
  var h=qs('#confH'); if(!h) return;
  qsa('.w',h).forEach(function(w,i){ w.style.transitionDelay=(i*0.055)+'s'; });
  if(soft || !io){ h.classList.add('in'); return; }
  var o=new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(!e.isIntersecting) return;
      h.classList.add('in'); o.unobserve(e.target);
    });
  },{threshold:.3});
  o.observe(h);
})();

/* ─────────── 8. SOMMAIRE DU RÉSEAU ─────────── */
(function(){
  var toc=qsa('.net-toc li');
  var cards=qsa('.entry');
  if(!toc.length||!cards.length) return;

  toc.forEach(function(li){
    li.addEventListener('click',function(){
      var t=qs('#'+li.dataset.go);
      if(t) t.scrollIntoView({behavior:soft?'auto':'smooth',block:'center'});
    });
  });

  if(!io) return;
  var o=new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(!e.isIntersecting) return;
      var i=cards.indexOf(e.target);
      toc.forEach(function(li,j){li.classList.toggle('on',j===i);});
    });
  },{rootMargin:'-42% 0px -42% 0px'});
  cards.forEach(function(c){o.observe(c);});
})();

/* ─────────── 9. BULLETIN ───────────
   La phrase remplit le bulletin. Validation au flou seulement,
   jamais pendant la frappe : personne n'aime se faire reprendre
   au milieu d'un mot.

   Et surtout : à l'envoi, il se passe quelque chose. Un formulaire qui
   affiche « enregistré » sans rien envoyer est la pire chose qu'on puisse
   mettre sur un site — la personne a fait sa part et attend une réponse qui
   ne viendra jamais. Deux chemins, un seul possible à la fois, et aucun
   mensonge : soit la base est configurée et on y écrit, soit on ouvre le
   courriel prérempli et on le dit.                                */
(function(){
  var form=qs('#joinForm')||qs('#formAsso'); if(!form) return;
  var asso = form.id==='formAsso';
  var inputs=qsa('.bk',form);
  var rows=qsa('.bl-rows li',form);
  var bar=qs('#blBar'), count=qs('#blCount'), stamp=qs('#blStamp');
  var ref=qs('#blRef'), bulletin=qs('#bulletin');
  var hint=qs('#jHint'), msg=qs('#jMsg'), consent=qs('#j-consent');
  var prefixe = asso ? 'RSV-AS-' : 'RSV-27-';
  var total = inputs.length;

  var HINTS={
    ent:'Le nom qui apparaîtra sur vos rapports. Il reste modifiable ensuite.',
    eff:'L\u2019effectif détermine le nombre de comptes ouverts et votre tranche de comparaison.',
    nom:'La personne qui suivra la saison chez vous. Souvent RH ou direction.',
    mail:'Une adresse professionnelle, pour vous envoyer le détail de l\u2019offre.',
    asso:'Le nom exact, celui du Journal officiel si vous l\u2019avez sous la main.',
    ville:'Pour vous proposer des entreprises proches de chez vous.',
    mot:'Des bras une demi-journée, du matériel précis. Le plus concret possible.'
  };
  var BASE = hint ? hint.textContent : '';

  /* Le message d'aide change avec le champ survole, et les textes n'ont pas la
     meme longueur : la ligne d'aide passait de une a quatre lignes, et TOUT ce
     qui est en dessous descendait de soixante pixels — dont le bouton
     « Ouvrir mon espace ». Ce n'est pas un detail d'affichage : le mouvement se
     produit au moment ou l'on appuie, parce que le champ perd le focus a cet
     instant precis. Le bouton se derobe sous le doigt entre l'appui et le
     relachement, le navigateur ne compte pas de clic, et le formulaire ne part
     pas. On reserve donc la hauteur du plus long des messages, une fois pour
     toutes, et plus rien ne bouge.

     La mesure se refait a chaque changement de largeur : le nombre de lignes
     depend de la place disponible. */
  function reserverHauteurAide(){
    if(!hint) return;
    var garde = hint.textContent, classe = hint.className;
    hint.style.minHeight = '';
    hint.className = 'j-hint';
    hint.textContent = BASE;
    var h = hint.getBoundingClientRect().height;
    for(var k in HINTS){ if(!HINTS.hasOwnProperty(k)) continue;
      hint.textContent = HINTS[k];
      h = Math.max(h, hint.getBoundingClientRect().height); }
    hint.textContent = garde; hint.className = classe;
    hint.style.minHeight = Math.ceil(h) + 'px';
  }
  reserverHauteurAide();
  var minuteurAide = null;
  addEventListener('resize', function(){
    clearTimeout(minuteurAide);
    minuteurAide = setTimeout(reserverHauteurAide, 150);
  });

  /* La largeur du champ suit son contenu, ou son placeholder tant qu'il est
     vide. Un fantome cache mesure le texte et donne la largeur.

     Il sous-estimait. La police demandee n'est pas toujours celle qui dessine,
     et le repli n'a pas les memes metriques : le fantome annoncait 256 px la ou
     le champ en dessinait 264, et le placeholder le plus long perdait ses trois
     dernieres lettres. « des bras un samedi matin » s'affichait « ... matir ».
     Le defaut ne se voyait pas en survolant la page, seulement sur une capture.

     On garde donc le fantome pour la mesure de depart, puis on demande au champ
     lui-meme, qui est le seul a savoir ce qu'il dessine. Pour cela il faut que
     le texte soit une VALEUR : un placeholder ne deborde pas, il est coupe en
     silence. On la pose et on la retire dans le meme tour de boucle, sans
     evenement, donc sans rien qui clignote. */
  function sizeField(inp){
    var g=inp.parentNode.querySelector('.ghost');
    if(!g) return;
    var txt=inp.value||inp.placeholder||'';
    g.textContent=txt;
    inp.style.setProperty('--w',(g.getBoundingClientRect().width+14)+'px');
    var besoin;
    if(inp.value){ besoin=inp.scrollWidth; }
    else { inp.value=txt; besoin=inp.scrollWidth; inp.value=''; }
    if(besoin>inp.clientWidth) inp.style.setProperty('--w',(besoin+14)+'px');
  }

  function valid(inp){
    var v=inp.value.trim();
    if(!v) return false;
    if(inp.dataset.key==='mail') return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
    if(inp.dataset.key==='eff') return /^\d{1,6}$/.test(v.replace(/\s/g,''));
    return v.length>1;
  }

  function sync(){
    var done=0;
    inputs.forEach(function(inp){
      var k=inp.dataset.key, ok=valid(inp);
      if(ok) done++;
      rows.forEach(function(r){
        if(r.dataset.key!==k) return;
        r.classList.toggle('done',ok);
        r.querySelector('.bl-v').textContent = inp.value.trim() || 'à compléter';
      });
    });
    /* La barre etait une courbe ondulee etiree en largeur, remplie par un
       decalage de pointilles. Deux choses ne marchaient pas. La longueur d'une
       ondulation n'est pas sa largeur : a deux champs sur quatre, le trait ne
       tombait pas au milieu. Et `preserveAspectRatio="none"` deformait la
       courbe differemment a chaque largeur d'ecran, donc l'erreur changeait
       avec la fenetre. Une barre de progression doit dire une chose et une
       seule : ou on en est. C'est maintenant une largeur en pourcentage. */
    if(bar){
      bar.style.width = Math.round(done/total*100) + '%';
      var prog = bar.closest('.bl-prog');
      if(prog) prog.setAttribute('aria-valuenow', done);
    }
    if(count) count.textContent=done+' / '+total;
    if(stamp) stamp.textContent = done===total ? 'Prêt à envoyer' : 'En cours de rédaction';
    if(bulletin) bulletin.classList.toggle('ready',done===total);

    var n=inputs[0].value.trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);
    if(ref) ref.textContent=prefixe+(n?n.padEnd(4,'.'):'....');
  }

  inputs.forEach(function(inp){
    sizeField(inp);
    inp.addEventListener('input',function(){
      sizeField(inp); sync();
      inp.classList.remove('bad');
      if(hint) hint.classList.remove('bad');
    });
    inp.addEventListener('focus',function(){
      if(hint && !hint.classList.contains('bad')) hint.textContent=HINTS[inp.dataset.key]||BASE;
    });
    inp.addEventListener('blur',function(){
      if(!inp.value.trim()){ inp.classList.remove('ok','bad'); return; }
      var ok=valid(inp);
      inp.classList.toggle('ok',ok);
      inp.classList.toggle('bad',!ok);
      if(!hint) return;
      if(!ok){
        hint.classList.add('bad');
        hint.textContent = inp.dataset.key==='mail'
          ? 'Cette adresse ne semble pas complète. Exemple : prenom.nom@exemple.fr'
          : 'Vérifiez ' + inp.dataset.label + '.';
      }else{
        hint.classList.remove('bad');
        hint.textContent=BASE;
      }
    });
  });
  addEventListener('resize',function(){inputs.forEach(sizeField);},{passive:true});
  sync();

  function valeurs(){
    var d={};
    inputs.forEach(function(i){ d[i.dataset.key]=i.value.trim(); });
    return d;
  }

  function courriel(d){
    var sujet = asso ? 'Riseva, une association vous écrit'
                     : 'Riseva, préinscription saison 2027';
    var corps = asso
      ? 'Association : '+d.asso+'\nVille : '+d.ville+'\nCe qui nous manque : '+d.mot
        +'\nContact : '+d.mail
      : 'Entreprise : '+d.ent+'\nEffectif : '+d.eff+'\nRéférent : '+d.nom
        +'\nContact : '+d.mail;
    return 'mailto:contact@riseva.fr?subject='+encodeURIComponent(sujet)
         + '&body='+encodeURIComponent(corps);
  }

  function replier(d, texte){
    msg.className='j-msg';
    msg.innerHTML = texte + ' <a href="'+courriel(d)+'">Ouvrir mon courrier</a>';
    if(stamp) stamp.textContent='À envoyer';
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var bad=inputs.filter(function(i){return !valid(i);});
    if(bad.length){
      bad.forEach(function(i){i.classList.add('bad');});
      msg.className='j-msg bad';
      /* « Il manque ce qui vous manque. » : le gabarit unique produisait cette
         phrase la ou l'etiquette du champ est deja une tournure. Un champ vide
         manque, un champ rempli mais invalide se verifie. */
      msg.textContent = bad[0].value.trim()
        ? 'Vérifiez ' + bad[0].dataset.label + '.'
        : 'Il manque ' + bad[0].dataset.label + '.';
      bad[0].focus();
      return;
    }
    if(consent && !consent.checked){
      msg.className='j-msg bad';
      msg.textContent='Cochez la case pour qu\u2019on puisse vous répondre.';
      consent.focus();
      return;
    }

    var d=valeurs();

    /* Une association ne demande pas un rendez-vous, elle demande un compte.
       Le formulaire ouvrait une conversation : « une personne vous rappelle
       sous deux jours ouvres ». C'etait une promesse a tenir a la main, un
       delai de plus entre l'envie et l'inscription, et une dependance a
       quelqu'un qui decroche. Les quatre champs deja saisis suffisent a ouvrir
       le compte : on les depose, et l'application les reprend pour creer la
       fiche et emmener directement dans le dossier a completer. */
    if(asso){
      /* On VERIFIE que le depot a eu lieu avant de rediriger. Le `try/catch`
         avalait l'echec — navigation privee, stockage bloque, quota plein — et
         partait quand meme vers l'application : la presidente arrivait sur un
         ecran de connexion, ses quatre reponses perdues, sans un mot. */
      var pose = false;
      try {
        localStorage.setItem('riseva.nouvelleAsso', JSON.stringify(d));
        pose = localStorage.getItem('riseva.nouvelleAsso') !== null;
      } catch(e){ pose = false; }
      if(!pose){
        replier(d, 'Votre navigateur empêche l\u2019ouverture directe du compte. '
                  +'Votre demande est prête, il ne manque qu\u2019un clic pour '
                  +'l\u2019envoyer depuis votre messagerie. Rien n\u2019est perdu.');
        return;
      }
      msg.className='j-msg ok';
      msg.textContent='Un instant, on vous emm\u00e8ne...';
      /* Le tampon disait « Compte ouvert » AVANT que quoi que ce soit soit
         ouvert : en production, l'application envoie d'abord un lien de
         connexion, et le compte n'existe qu'au retour de ce lien. Annoncer un
         fait avant qu'il soit vrai est la seule chose qu'un formulaire ne doit
         jamais faire. */
      if(stamp) stamp.textContent='Demande enregistr\u00e9e';
      location.href='/app/';
      return;
    }

    var cfg = window.RISEVA_CONFIG;
    msg.className='j-msg';
    msg.textContent='Envoi...';

    if(!cfg || !cfg.url || !cfg.anonKey){
      replier(d, 'Le formulaire n\u2019est pas encore relié à notre boîte. '
                +'Votre message est prêt, il ne manque qu\u2019un clic pour l\u2019envoyer '
                +'depuis votre messagerie. Nous répondons à tout le monde.');
      return;
    }
    var table = asso ? 'contact_association' : 'preinscription';
    fetch(cfg.url+'/rest/v1/'+table,{
      method:'POST',
      headers:{'apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey,
               'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify(d)
    }).then(function(r){
      if(!r.ok) throw new Error('écriture refusée ('+r.status+')');
      msg.className='j-msg ok';
      /* Pas de delai promis : personne ne le tiendrait, et la preinscription se
         suffit a elle-meme. Ce qu'elle fait est ecrit, et c'est verifiable. */
      msg.textContent = 'Préinscription enregistrée. Elle vous réserve une place au tarif '
        + 'fondateur et n\u2019engage à rien.';
      if(stamp) stamp.textContent='Envoyé';
    }).catch(function(err){
      replier(d, 'Nous n\u2019avons pas pu enregistrer votre message ('+err.message+'). '
                +'Votre texte est prêt à partir par courriel, rien n\u2019est perdu.');
    });
  });
})();

/* ─────────── 10. (libre) ───────────
   Le curseur dessine en JavaScript a ete retire : il privait l'utilisateur
   des affordances de son systeme et repondait avec une image de retard.   */

/* ─────────── 10 bis. SIMULATEUR DE TARIF ───────────
   Le meme calcul que la plateforme, ecrit une seule fois ici et lu depuis la
   grille rendue dans la page : deux formules du meme prix a deux endroits, ce
   sont deux prix differents au premier changement de grille.               */
(function(){
  var eff=qs('#simEff'), sites=qs('#simSites'), out=qs('#simOut');
  if(!eff||!sites||!out) return;
  var lignes=[].slice.call(document.querySelectorAll('#prix .tar-t tbody tr'));
  var paliers=lignes.map(function(tr){
    var nb=function(s){ return parseInt(String(s).replace(/[^0-9]/g,''),10)||0; };
    var eff=tr.children[0].textContent;
    var m=eff.match(/(\d[\d\s\u202f]*)\s*(?:à|a)\s*(\d[\d\s\u202f]*)/);
    var max = m ? nb(m[2]) : (/Moins de/.test(eff) ? nb(eff)-1 : Infinity);
    return { max:max, prix:nb(tr.children[1].querySelector('b').textContent),
             sites:nb(tr.children[2].textContent) };
  });
  var supp=(function(){
    var m=qs('#prix .tar-n').textContent.match(/(\d[\d\s\u202f]*)\s*€/);
    return m?parseInt(m[1].replace(/[^0-9]/g,''),10):0;
  })();
  var eur=function(n){ return n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g,' ')+' €'; };
  function maj(){
    /* Un champ vidé pour retaper un nombre ne doit pas produire une phrase : il
       affichait « 2 160 € HT, soit 2160,0 € par salarié », ce qui est absurde
       une demi-seconde par frappe. On laisse le résultat précédent. */
    if(!String(eff.value).trim()) return;
    var plafond=parseInt(eff.max,10)||Infinity;
    /* L'attribut `max` du champ n'était appliqué par personne : un effectif de
       999 999 rendait « 0,0 € par salarié ». */
    var e=Math.min(plafond,Math.max(1,parseInt(eff.value,10)||1));
    var s=Math.max(1,parseInt(sites.value,10)||1);
    var p=null;
    for(var i=0;i<paliers.length;i++){ if(e<=paliers[i].max){ p=paliers[i]; break; } }
    if(!p) p=paliers[paliers.length-1];
    var facturables=Math.max(0,s-p.sites);
    var base=p.prix+facturables*supp;
    var ht=base-Math.round(base*0.10);
    var acompte=Math.min(ht,Math.max(900,Math.round(ht*0.40)));

    /* La dernière tranche est « sur devis », et la grille juste au-dessus le dit
       en toutes lettres : « à partir de 18 500 € HT ». Le simulateur, lui,
       répondait un montant FERME et un acompte chiffré — et un montant
       INFÉRIEUR au plancher affiché deux centimètres plus haut, parce que la
       remise de lancement s'appliquait à un prix qui est déjà un plancher. Un
       acheteur avait deux prix contradictoires sous les yeux. */
    if(p.max===Infinity){
      out.innerHTML='À partir de <b>'+eur(p.prix)+' HT</b> la saison : au-delà de '
        +'deux mille salariés, le tarif est établi sur devis. Nous le calculons '
        +'avec vous, sites compris'
        +(facturables?' — vous en déclarez '+s+'.':'.');
      return;
    }
    out.innerHTML='<b>'+eur(ht)+' HT</b> la saison au tarif fondateur, soit '
      +(ht/e).toFixed(1).replace('.',',')+' € par salarié. Acompte de <b>'+eur(acompte)
      +'</b> à la commande'
      +(facturables?', dont '+facturables+' site'+(facturables>1?'s':'')+' au-delà de ceux compris':'')
      +'.';
  }
  eff.addEventListener('input',maj); sites.addEventListener('input',maj); maj();
})();

/* ─────────── 11. MENU MOBILE ───────────
   Le panneau se ferme au clic sur un lien, a la touche Echap et
   des que l'ecran redevient large.                            */
(function(){
  var burger=qs('#navBurger'), sheet=qs('#navSheet');
  if(!burger||!sheet) return;
  var open=false;

  function set(v){
    open=v;
    burger.setAttribute('aria-expanded', v?'true':'false');
    burger.setAttribute('aria-label', v?'Fermer le menu':'Ouvrir le menu');
    document.body.style.overflow = v?'hidden':'';
    if(v){
      sheet.hidden=false;
      requestAnimationFrame(function(){ sheet.classList.add('on'); });
    }else{
      sheet.classList.remove('on');
      setTimeout(function(){ if(!open) sheet.hidden=true; }, 340);
    }
  }
  burger.addEventListener('click',function(){ set(!open); });
  qsa('a',sheet).forEach(function(a){ a.addEventListener('click',function(){ set(false); }); });
  addEventListener('keydown',function(e){ if(e.key==='Escape'&&open) set(false); });
  addEventListener('resize',function(){ if(open&&innerWidth>1000) set(false); },{passive:true});
})();

})();

/* ══════════════════════════════════════════════════════════════
   RUBANS : des lianes qui entrent hors cadre, plongent dans la
   page et ressortent du meme cote.

   Elles sont ancrees dans la page et defilent donc exactement
   avec le contenu, au pixel pres : rien n'est repositionne au
   scroll, donc rien ne peut prendre de retard sur lui. Le seul
   mouvement est le trace, joue une fois quand la liane entre
   dans l'ecran, et confie a une transition CSS.

   L'ancienne version faisait courir un segment le long du trace
   a chaque image : le segment avancait presque aussi vite que la
   page remontait, il restait donc scotche en haut de l'ecran et
   semblait se faire distancer. Mesure avant correction : entre
   30 et 95 px du haut sur 900 px de defilement.
   ══════════════════════════════════════════════════════════════ */
(function(){
  var wraps = [].slice.call(document.querySelectorAll('.ribbons'));
  if(!wraps.length) return;

  var ribs = [];
  wraps.forEach(function(w){
    [].slice.call(w.querySelectorAll('.rib')).forEach(function(el){
      ribs.push({el:el, y0:+el.dataset.y0/1000, drawn:false});
    });
  });
  if(!ribs.length) return;

  if(document.body.classList.contains('lite')){
    wraps.forEach(function(w){ w.style.display='none'; });
    return;
  }

  var H = 0;
  function resize(){
    /* les calques sont places en % : le conteneur doit donc porter la
       hauteur reelle du document, sinon ils se replient a quelques
       dizaines de pixels */
    H = document.body.scrollHeight;
    wraps.forEach(function(w){ w.style.height = H + 'px'; });
  }


  var soft = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(soft){
    resize();
    ribs.forEach(function(r){ r.el.classList.add('in'); });
    return;
  }

  /* une liane se trace quand son depart approche du bas de
     l'ecran ; ensuite elle reste, et defile avec la page */
  function check(){
    var vh = innerHeight, top = window.scrollY || window.pageYOffset;
    for(var i=0;i<ribs.length;i++){
      var r = ribs[i];
      if(r.drawn) continue;
      if(r.y0*H < top + vh*0.92){
        r.drawn = true;
        r.el.classList.add('in');
      }
    }
  }

  var raf = null;
  function kick(){
    if(raf) return;
    raf = requestAnimationFrame(function(){ raf=null; check(); });
  }
  resize(); check();
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', function(){ resize(); check(); }, {passive:true});
  addEventListener('load', function(){ resize(); check(); });
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ resize(); check(); });
  }
  if(window.ResizeObserver){
    var t = null;
    new ResizeObserver(function(){
      clearTimeout(t);
      t = setTimeout(function(){ resize(); check(); }, 140);
    }).observe(document.body);
  }
})();

/* ══════════════════════════════════════════════════════════════
   LES QUATRE CHIFFRES DE TETE, QUI MONTENT A L'ARRIVEE

   Le nombre final est ecrit dans le HTML. C'est lui que lisent un
   moteur d'indexation, un lecteur d'ecran et un navigateur sans
   JavaScript ; ce script ne fait que rejouer le trajet depuis zero,
   une fois, et remet la valeur exacte a la fin plutot qu'un arrondi
   de l'animation. Un compteur qui anime un chiffre absent du HTML
   est un chiffre que personne d'autre qu'un navigateur moderne ne
   verra jamais.

   Le bloc est autonome : il redeclare ses deux aides plutot que
   d'emprunter celles d'une IIFE voisine, parce qu'un voisin qui
   sort tot emporterait tout ce qui le suit.
   ══════════════════════════════════════════════════════════════ */
(function(){
  var els = [].slice.call(document.querySelectorAll('.chiffres b, .verre-chiffre b'));
  if(!els.length) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(!('IntersectionObserver' in window)) return;
  var obs = new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(!e.isIntersecting) return;
      obs.unobserve(e.target);
      var el = e.target, fin = el.textContent;
      var m = fin.match(/^([^\d]*)([\d\s\u202f,.]+)(.*)$/);
      if(!m) return;
      /* L'espace qui separe le nombre de son unite appartient au suffixe :
         sans ca, les images intermediaires affichent « 0Md€ ». */
      var suffixe = (/[\s\u202f]$/.test(m[2]) ? '\u202f' : '') + m[3];
      var brut = m[2].replace(/[\s\u202f]/g, '').replace(',', '.');
      var val = parseFloat(brut);
      if(!isFinite(val) || val <= 0) return;
      var dec = (brut.split('.')[1] || '').length;
      var t0 = null, duree = 900;
      function pas(t){
        if(t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / duree);
        var v = val * (1 - Math.pow(1 - k, 3));
        el.textContent = m[1] + v.toFixed(dec).replace('.', ',') + suffixe;
        if(k < 1) requestAnimationFrame(pas);
        else el.textContent = fin;
      }
      requestAnimationFrame(pas);
    });
  }, { threshold: 0.6 });
  els.forEach(function(el){ obs.observe(el); });
})();

/* ══════════════════════════════════════════════════════════════
   LA BOUCLE VIDEO, COUPEE POUR QUI L'A DEMANDE

   L'attribut `autoplay` du HTML ne connait pas la preference du
   systeme. Un visiteur qui a demande moins d'animation — parce que
   le mouvement lui donne le vertige, ou simplement parce qu'il en a
   assez — recevrait quand meme une boucle de dix secondes. On la
   met donc en pause et on laisse l'affiche : la premiere image du
   film est deja servie, la page ne perd rien.
   ══════════════════════════════════════════════════════════════ */
(function(){
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  [].slice.call(document.querySelectorAll('.video video')).forEach(function(v){
    v.autoplay = false;
    v.removeAttribute('autoplay');
    try { v.pause(); } catch(e){}
    /* Et on retire les sources : sans elles, l'affiche reste affichee et
       aucun octet de video n'est telecharge pour rien. */
    [].slice.call(v.querySelectorAll('source')).forEach(function(s){ s.remove(); });
    try { v.load(); } catch(e){}
  });
})();

/* ══════════════════════════════════════════════════════════════
   LA SECTION DE VERRE

   Trois choses, et trois seulement. Le reflet speculaire et l'angle
   de l'arete qui suivent le pointeur, la parallaxe des maquettes a
   l'interieur du panneau, et la classe `.vu` qui declenche toutes
   les entrees d'un seul signal.

   Deux regles gouvernent ce bloc.

   On ne lit jamais une position pendant un `pointermove`. Un
   `getBoundingClientRect()` demande au navigateur une mise en page a
   jour, soixante fois par seconde, pour un panneau qui n'a pas bouge
   d'un pixel. On mesure une fois, on garde le defilement qu'il y
   avait a la mesure, et la position a l'ecran s'en deduit par une
   soustraction.

   Et on n'ecrit une variable que la ou elle sert. `--mx`, `--my` et
   `--verre-arc` vont sur un element VIDE, `.verre-lumiere`, dont le
   seul sous-arbre est ses deux pseudo-elements. Seule `--px` / `--py`,
   qui doit atteindre les maquettes, est ecrite sur le panneau.
   ══════════════════════════════════════════════════════════════ */
(function(){
  /* Il y a maintenant plusieurs sections de verre sur la page : la console qui
     presente la plateforme, et le panneau pose sur la photographie du
     challenge. Chacune a son panneau, son calque de lumiere et sa geometrie ;
     le bloc s'applique donc a chacune, sans rien partager entre elles. */
  [].slice.call(document.querySelectorAll('.verre-sect')).forEach(monter);

  function monter(sect){

  var panneau = sect.querySelector('.verre');
  var lumiere = sect.querySelector('.verre-lumiere');

  /* L'entree, d'abord : elle doit marcher meme quand tout le reste est
     desactive. Un seul signal, `.vu` sur la section, et la feuille de style
     s'occupe de l'ordre et des retards. */
  if(!('IntersectionObserver' in window) ||
     matchMedia('(prefers-reduced-motion:reduce)').matches){
    sect.classList.add('vu');
  } else {
    var io = new IntersectionObserver(function(entrees){
      entrees.forEach(function(en){
        if(!en.isIntersecting) return;
        sect.classList.add('vu');
        io.disconnect();
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    io.observe(sect);
  }

  /* L'eclat ne sert qu'une fois. Le laisser en place, c'est laisser un calque
     translucide au-dessus d'un element filtre que le navigateur doit recomposer
     a chaque repeinture, pour un element devenu invisible. */
  var eclat = sect.querySelector('.verre-eclat');
  if(eclat){
    eclat.addEventListener('animationend', function(){
      if(eclat.parentNode) eclat.parentNode.removeChild(eclat);
    });
  }

  if(!panneau || !lumiere) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  var boite = null, mesureA = 0;
  function mesurer(){
    mesureA = window.scrollY || window.pageYOffset;
    var r = panneau.getBoundingClientRect();
    boite = { g:r.left, h:r.top, l:r.width, t:r.height };
  }
  /* Trois occasions de remesurer, et pas une de plus : un redimensionnement, un
     changement de taille reel de la section (rotation d'un telephone, zoom du
     navigateur, police qui arrive tard), et l'entree du pointeur. */
  addEventListener('resize', function(){ boite = null; }, { passive:true });
  sect.addEventListener('pointerenter', function(){ boite = null; }, { passive:true });
  if(window.ResizeObserver){
    new ResizeObserver(function(){ boite = null; }).observe(sect);
  }

  var x = 0, y = 0, prevu = false;

  function peindre(){
    prevu = false;
    if(!boite) mesurer();
    var dy = (window.scrollY || window.pageYOffset) - mesureA;
    var haut = boite.h - dy;
    /* Hors de l'ecran, le reflet n'existe pour personne. */
    if(haut + boite.t < 0 || haut > innerHeight) return;

    var mx = x - boite.g, my = y - haut;
    lumiere.style.setProperty('--mx', mx.toFixed(1) + 'px');
    lumiere.style.setProperty('--my', my.toFixed(1) + 'px');

    /* La meme lumiere pour l'arete que pour la surface : une arete dont la zone
       claire ne repond pas a la meme source que le reflet est le detail qui
       trahit le faux verre. `atan2` rend zero vers la droite et croit vers le
       bas ; un degrade conique part du haut et tourne dans le sens des
       aiguilles, d'ou le quart de tour. Les 48 degres retranches placent la
       zone claire du degrade, et non son origine, du cote du pointeur. */
    var ang = Math.atan2(my - boite.t / 2, mx - boite.l / 2) * 180 / Math.PI;
    lumiere.style.setProperty('--verre-arc', (ang + 42).toFixed(0) + 'deg');

    /* Et la parallaxe des maquettes, normalisee entre moins un et un. */
    panneau.style.setProperty('--px', ((mx / boite.l) * 2 - 1).toFixed(3));
    panneau.style.setProperty('--py', ((my / boite.t) * 2 - 1).toFixed(3));
  }

  sect.addEventListener('pointermove', function(e){
    /* Le doigt n'a pas de survol : lui peindre un reflet sous le point de
       contact ne montre rien et fait travailler la machine pour rien. */
    if(e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    if(!prevu){ prevu = true; requestAnimationFrame(peindre); }
  }, { passive: true });

  /* Tant qu'aucun pointeur n'est entre dans la section, la feuille de style
     fait tourner la lumiere toute seule : sur un telephone, c'est la seule
     chose qui la fait vivre. Des qu'un pointeur arrive, on coupe la rotation et
     on lui rend la main ; quand il repart, elle reprend. */
  sect.addEventListener('pointerenter', function(e){
    if(e.pointerType === 'touch') return;
    sect.classList.add('pointe');
  }, { passive:true });
  sect.addEventListener('pointerleave', function(){
    sect.classList.remove('pointe');
  }, { passive:true });
  }
})();
