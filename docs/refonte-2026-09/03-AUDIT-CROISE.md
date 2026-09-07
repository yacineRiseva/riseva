# Refonte des vitrines : audit croise ChatGPT et Gemini sur l'existant

Le 6 septembre 2026, le meme brief a ete soumis separement a ChatGPT (mode Chat,
raisonnement eleve, avec navigation sur riseva.fr) et a Gemini Pro. Le brief
decrivait les deux pages telles qu'elles sont dans le depot, avec le design
system fige et les interdits du canon. Ce document compare leurs conclusions a
l'audit interne (`01-AUDIT.md`) et tranche les desaccords. Les deux reponses
integrales sont dans `annexes/audit-chatgpt.md` et `annexes/audit-gemini.md`.

## Un fait revele par ChatGPT

En ouvrant riseva.fr, ChatGPT a lu une **version anterieure** du site : heros
« Vos equipes n'ont pas besoin d'un outil de plus. Il leur faut un defi. »,
navigation « La saison / Cle en main / Les retombees / Le voyage / Le confluent »,
« Edition 2027 ». Verification faite : la production sert la version de juillet.
Rien de ce qui a ete commis depuis le 20 aout n'est en ligne. Vercel n'est pas
encore rebranche sur `yacineRiseva/riseva`. La refonte ne servira a rien tant
que ce point n'est pas regle : c'est la premiere action apres la livraison.

## Ce sur quoi les trois audits convergent

1. La page entreprises est trop longue et se repete : les piliers, les trois
   questions, l'outil, le challenge et la confirmation racontent le meme systeme
   sous cinq angles. Reduction d'un tiers au minimum, par fusion.
2. Les panneaux translucides sur fond sombre et les filigranes decoratifs
   sortent. Gemini : « une allure de template prefabrique pour une application
   grand public, pas pour un outil facture jusqu'a dix-huit mille euros ».
3. Les illustrations generees sortent des deux pages. ChatGPT : « des le premier
   ecran, tu annonces visuellement : nous n'avons rien de reel a montrer ».
   Gemini : « une honnetete suicidaire ». Le produit reel prend leur place.
4. La capture « 81 animaux pris en charge » de la page associations sort : meme
   etiquetee demonstration, elle imite un historique que Riseva n'a pas. A sa
   place, le parcours reel : la creation d'une annonce, la reponse d'un salarie,
   le courriel de confirmation.
5. La chaine « l'association publie, un salarie repond, l'association confirme,
   l'entreprise retrouve le fait dans son rapport » est l'argument le plus
   intelligible de Riseva et n'est visible nulle part en premier ecran. Elle
   devient la colonne vertebrale des deux pages.
6. « Premiere saison : janvier 2027 » doit etre ecrit en evidence, sur les deux
   sites. Ce n'est pas un aveu, c'est une information de diligence.
7. A conserver mot pour mot : « Ce que vous ne referez plus a la main »,
   « Douze mois plus tard, vous n'avez pas de bilan a ecrire », « Un lien, une
   affiche, et chacun peut se proposer », « Ce qui est confirme entre dans votre
   bilan », « Gratuit. Ce sont les entreprises qui paient », « Ecrivez ce qui
   vous manque. Des entreprises d'a cote peuvent y repondre. », « Vous decidez
   de ce que vous acceptez, et c'est vous qui confirmez ce qui a eu lieu. »
8. Le formulaire en phrase a trous est la signature de la page associations, et
   son plus grand risque d'accessibilite : chaque trou garde un vrai label, un
   ordre de tabulation evident, une version empilee sur petit ecran, des cibles
   larges.
9. La FAQ liste + panneau est un gabarit de bureau ; sur mobile elle devient une
   succession simple, navigable au clavier, etat ouvert annonce.
10. La repetition mecanique de formules chiffrees (« trois gestes », « quatre
    lignes », « un courriel », « un lien ») sent la recette. Deux donnent un
    style, six donnent une mecanique.

## Les desaccords, et ce qui est decide

**Le h1 entreprises.** ChatGPT le garde mot pour mot. Gemini le juge en echec
et propose « Transformez l'action locale de vos equipes en rapports RSE
certifies ». Cette proposition contient le mot que Riseva ne prononce jamais :
elle ne certifie rien, c'est la premiere ligne du canon. Decision : le h1 garde
sa substance (multi-sites, rapport, terrain), et c'est le sous-titre qui
explique le mecanisme qui relie les deux, comme ChatGPT le demande. Les
variantes sont testees dans `04-ARCHITECTURE.md`.

**Le prix sur la page.** ChatGPT le remonte juste apres la demonstration du
produit et garde « Calculer mon tarif » en action principale : un prix public et
deterministe est une information que l'acheteur cherche avant tout contact.
Gemini retire la grille de la page d'accueil et passe a « demander une
demonstration ». Le benchmark du secteur tranche : aucun acteur francais de
l'engagement salarie n'affiche un tarif, et Riseva se vend explicitement en bas
de fourchette a des PME sans commercial. Cacher le prix effacerait le seul
argument que les concurrents ne peuvent pas copier sans se renier. Decision :
le prix reste sur la page et remonte. L'idee de Gemini d'offrir **un exemple de
rapport tel que la plateforme le produit** est retenue comme preuve, pas comme
action principale : c'est un artefact reel et il repond a « d'ou sort ce
chiffre ? ».

**« On ne vous facture pas une promesse ».** ChatGPT : fort, a condition que le
bloc suivant soit purement factuel. Gemini : posture defensive qui instille le
doute. Le fond est un vrai differenciant, les cinq criteres de demarrage et
l'acompte rembourse, que personne d'autre n'offre. Decision : le bloc final
garde ces faits et s'ouvre sur une formulation positive (« La saison commence
quand l'outil marche chez vous »), la phrase actuelle passe en appui ou
disparait, au test de lecture.

**« Vous n'etes pas le produit, vous etes ce qu'elles cherchent. »** Gemini :
« fulgurance strategique », a garder tel quel. ChatGPT : « trop ecrit, cherche
l'applaudissement ». L'idee est juste, elle inverse le rapport de force et rend
sa dignite a l'association. La phrase, elle, est une formule de copywriter qui
cite un cliche du web (« si c'est gratuit, vous etes le produit ») qu'une
presidente d'association de soixante ans n'a aucune raison de connaitre.
Decision : l'idee reste, la phrase est reecrite plus plate, au niveau du
lecteur.

**« Ouvrir mon espace ».** Gemini y entend le lexique des impots et des
assurances et veut que le bouton soit la suite de la phrase a trous. ChatGPT le
trouve juste. L'observation de Gemini est la plus fine des deux audits : un
bouton qui termine la phrase qu'on vient d'ecrire garde le lecteur dans son
geste. Mais « Publier ce besoin » mentirait, l'annonce ne parait qu'apres
verification de l'enregistrement. Decision : le bouton complete la phrase et
dit ce qui se passe vraiment, formulation arretee dans la phase d'ecriture.

**Le bareme en points sur la page entreprises.** Gemini le trouve cynique aux
yeux d'un auditeur ; ChatGPT le garde comme preuve de fonctionnement. Le
produit a un classement, c'est un fait, mais `DESIGN.md` dit deja qu'il n'est
« jamais la premiere chose affichee : une consequence, pas un but ». Decision :
la saison et le classement restent une section, le tableau de points descend
dans le reglement, ou il est deja.

**Le visage du fondateur et une validation tierce** (Gemini). Le canon interdit
le prenom du fondateur ou que ce soit, et aucune validation tierce n'existe.
Decision : la solidite passe par l'identite legale visible (RISEVA, SASU, RCS
Meaux des reception du Kbis), les textes contractuels lisibles avant de signer,
et l'absence de toute affirmation invérifiable. Rien d'autre.

**Une boucle video de douze secondes a la place des cinq onglets** (Gemini).
Idee retenue sous une forme honnete : l'application existe et tourne en local
avec son jeu de demonstration, on peut en enregistrer le vrai mouvement, ou
animer une vraie interface en CSS. Faisabilite tranchee dans
`05-LANGAGE-VISUEL.md`.

## Ce que l'audit croise ajoute a l'audit interne

- Le code QR de l'affiche perd son sens quand la page est lue sur un telephone :
  prevoir l'equivalent cliquable (ChatGPT).
- Les captures de tableau de bord seront illisibles en reduction : recadrer sur
  l'element qui prouve la phrase, et ne jamais compter sur un zoom (ChatGPT,
  et les references premium disent la meme chose).
- La fiscalite ne doit pas servir de raccourci universel autour du « 60 % » : les
  formats n'ont pas tous le meme traitement, la nuance inspire plus confiance
  que le gros chiffre (ChatGPT).
- Pour les associations, il manque une section compacte sur leur controle :
  choisir le besoin et la date, accepter ou refuser, modifier ou retirer
  l'annonce, ne confirmer que ce qui a eu lieu (ChatGPT). Elle rejoint ce que
  la recherche secteur a trouve : personne ne dit aux associations qu'elles
  peuvent refuser sans penalite.
- Mettre en evidence le rayon de trente kilometres : « le declencheur emotionnel
  et pratique le plus puissant pour ce public » (Gemini).
- Le lien de connexion sans mot de passe ne doit pas devenir le petit lien gris
  que personne ne voit (ChatGPT).
