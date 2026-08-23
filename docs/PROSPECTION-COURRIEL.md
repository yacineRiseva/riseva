# Démarcher les associations par courriel, sans finir en indésirable

Vérifié le 23/08/2026. Deux sujets qu'on confond souvent : ce que le droit
autorise, et ce que Gmail accepte. Les deux peuvent dire non séparément.

## 1. Le droit : ce qu'on a le droit d'envoyer

La CNIL sépare deux régimes. Vers un **particulier**, il faut un consentement
préalable, libre, spécifique, éclairé et univoque, obtenu par un acte positif :
une case à cocher non pré-cochée, jamais l'acceptation de conditions générales.
Vers un **professionnel**, l'intérêt légitime suffit, à une condition : la
sollicitation doit **être en rapport avec la fonction de la personne démarchée**.

Le point qui nous concerne, et qui simplifie tout : les adresses **génériques**
du type `contact@`, `info@`, `bureau@` ne relèvent pas de ces règles, parce
qu'elles représentent l'organisme et non une personne. Écrire à
`contact@association.fr` pour proposer des bénévoles et des dons à une
association est donc licite sans consentement préalable.

Ce qui reste obligatoire dans tous les cas :

- **identifier l'expéditeur** clairement, sans ambiguïté ni adresse de rebond
  anonyme ;
- **offrir un moyen simple et gratuit de s'opposer** aux envois suivants, dans
  le message lui-même ;
- **informer** la personne, au moment de la collecte, de ce qu'on fait de ses
  données et de ses droits.

Trois règles qu'on se donne en plus, et qui ne sont pas dans les textes :

- une adresse nominative de président trouvée sur un site n'est pas générique.
  On écrit à l'adresse générique quand elle existe, et on ne cherche pas
  l'adresse personnelle ;
- une opposition est honorée **immédiatement et définitivement**, y compris sur
  une future campagne ;
- on ne relance pas plus d'**une fois**. Une seconde relance ne convertit
  presque personne et coûte le taux de plainte.

## 2. La technique : ce que Gmail accepte

Ces exigences sont celles de Google et Yahoo, alignées depuis 2024 et étendues
à Outlook.com en 2026. Elles se vérifient avant le premier envoi, pas après le
premier rebond.

**Pour tout expéditeur, quel que soit le volume**

| Ce qu'il faut | Pourquoi |
|---|---|
| SPF **et** DKIM, les deux, pas l'un ou l'autre | Un seul des deux ne suffit plus |
| Clé DKIM de 2048 bits | 1024 est accepté mais déclassé |
| Un enregistrement DMARC, au minimum `p=none` avec rapports | Sans lui, le domaine est traité comme non authentifié |
| DNS direct et inverse valides sur l'IP d'envoi (PTR) | Une IP sans reverse est un signal de masse |
| TLS pour la transmission | Non chiffré vaut suspect |
| Un `From:` qui n'imite ni Gmail ni Yahoo | Évident, et pourtant |

**Au-delà de 5 000 messages par jour vers Gmail**, trois exigences s'ajoutent, et
le seuil est **permanent une fois franchi** :

- **alignement DMARC** : il ne suffit pas que SPF ou DKIM passe, le domaine
  authentifié doit correspondre au domaine visible du `From:` ;
- **désabonnement en un clic** par les en-têtes `List-Unsubscribe` et
  `List-Unsubscribe-Post` (RFC 8058), sans connexion, honoré sous 48 heures ;
- **taux de plainte** sous 0,1 %, et **jamais 0,3 %**. Au-delà, la délivrabilité
  s'effondre et ne revient pas d'elle-même. Il se surveille dans Google
  Postmaster Tools, qui se configure avant la première campagne.

**Ce qu'on fait, concrètement, pour Riseva**

1. Envoyer depuis un **sous-domaine dédié** (`envois.riseva.fr` par exemple), et
   jamais depuis le domaine qui porte les courriels de l'équipe. Une campagne
   qui se fait déclasser n'emporte pas la messagerie de la société avec elle.
2. **Chauffer** le domaine : commencer à vingt ou trente envois par jour pendant
   une à deux semaines, puis doubler tous les deux ou trois jours. Un domaine
   neuf qui envoie mille messages le premier jour est classé indésirable avant
   d'avoir été lu.
3. Rester **sous 5 000 par jour** aussi longtemps que possible. À notre échelle
   c'est facile, et cela évite le régime le plus exigeant. Le désabonnement en
   un clic est de toute façon une bonne idée : on le met en place quand même.
4. Poser SPF, DKIM 2048 et DMARC, vérifier l'alignement, et enregistrer le
   domaine dans Postmaster Tools **avant** le premier envoi.

## 3. Ce qui fait classer un message en indésirable, en dehors de la technique

Le filtre lit aussi le contenu. Un message conforme et bien authentifié peut
finir en indésirable pour ces raisons, dans l'ordre de fréquence :

- **une image et rien d'autre**. Un courriel qui n'est qu'une bannière est le
  motif le plus classique. Écrire en texte, et se passer d'images ;
- **une version texte absente**. Envoyer en `multipart/alternative`, avec une
  partie texte réelle et pas un dépôt de balises ;
- **un raccourcisseur de lien** (`bit.ly` et les autres). On met le lien complet
  vers `riseva.fr`, et un seul ;
- **une pièce jointe**. Aucune, jamais, sur un premier contact ;
- **trop de liens**. Un lien vers la page associations, un lien de
  désabonnement, c'est tout ;
- **un objet en capitales, avec des points d'exclamation ou le mot gratuit en
  tête**. Notre offre est gratuite, on l'écrit dans le corps, pas dans l'objet ;
- **une adresse de réponse différente de l'expéditeur**. `Reply-To` doit être
  une vraie boîte que quelqu'un relève ;
- **une liste achetée**. Les adresses mortes et les pièges à spam font plus de
  dégâts qu'une campagne ratée. On construit la liste à la main, à partir des
  sites des associations et du Journal officiel.

## 4. Ce que doit contenir le message

Court, nominatif, une seule demande, et la sortie visible. Ce qui suit tient en
quinze lignes et se lit sur un téléphone.

- **Objet** : factuel, sans majuscules ni exclamation. « Des bénévoles
  d'entreprises près de [ville] » fonctionne mieux que « Offre gratuite pour
  votre association ».
- **Première phrase** : ce qu'on a vu de leur association, précisément. Une
  phrase générique se repère à la première ligne.
- **Le fond** : des salariés d'entreprises abonnées cherchent des missions
  près de chez eux. C'est gratuit pour l'association, sans exclusivité, sans
  commission sur les dons, et l'argent va du donateur à l'association sans
  passer par Riseva.
- **Une seule demande** : un lien vers `riseva.fr/associations.html`, ou une
  réponse à ce courriel. Pas les deux comme deux boutons.
- **La signature** : un nom, une fonction, un téléphone, l'adresse postale de la
  société. Un pied de page sans adresse fait amateur et affaiblit la confiance.
- **La sortie** : une ligne, en clair. « Si vous ne voulez plus recevoir de
  message de notre part, répondez STOP et vous ne serez plus jamais recontacté. »

## Sources

- CNIL, la prospection commerciale et la prospection par courrier électronique.
- Exigences expéditeurs Google et Yahoo, en vigueur depuis février 2024,
  étendues à Outlook.com en 2026.
