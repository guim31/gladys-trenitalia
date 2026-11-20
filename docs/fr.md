# Trenitalia

Les prochains trains de vos gares en Italie, dans Gladys : trains régionaux, Frecciarossa,
Intercity… en temps réel, avec retards, voies et suppressions.

Les données viennent de [Viaggiatreno](http://www.viaggiatreno.it), le tableau temps réel de RFI
et de Trenitalia : **ni compte, ni clé**. Viaggiatreno est un site public, pas une API officielle :
il peut changer sans prévenir. Cette intégration n'est affiliée ni à Trenitalia, ni à RFI, ni au
groupe Ferrovie dello Stato Italiane.

> **Développée hors d'Italie : vos retours sont les bienvenus.** Elle a été construite et testée sur
> le service Viaggiatreno réel (Milano Centrale, Roma Termini, Firenze Santa Maria Novella, Torino
> Porta Nuova), pas encore à l'usage quotidien.

## Ce que vous obtenez

- **Un appareil par gare suivie**, filtrable par catégorie de train (régionaux, Frecce,
  Intercity) et par destination : minutes avant le prochain train qui circule et avant le suivant,
  retard du prochain, son heure, son numéro et sa destination (« 22:50 FR 9663 → Napoli
  Centrale »), sa voie, et le nombre de trains supprimés au tableau.
- **Un widget de tableau de bord** : les prochains départs d'une gare, colorés selon leur retard,
  suppressions comprises.
- **Trois déclencheurs de scène** : il est temps de partir (1 à 30 minutes avant un départ), train
  en retard (5 à 60 minutes) et train supprimé, chacun une fois par train.
- **Une action de scène** : lire les prochains trains d'une gare, avec une phrase prête à envoyer
  par message ou sur une enceinte.

## Prérequis

- Gladys Assistant 5.3.0 ou plus récent.
- Un accès Internet depuis la machine de Gladys (l'intégration appelle `www.viaggiatreno.it`).

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub**.
2. Collez `https://github.com/guim31/gladys-trenitalia` et installez.
3. Ouvrez l'onglet **Configuration** de l'intégration pour suivre des gares (ci-dessous).

## Configuration

### Réglages

- **Langue des textes** : langue des noms de fonctionnalités, des textes des appareils et des
  phrases envoyées à vos scènes (français par défaut). Les noms des fonctionnalités sont fixés à la
  création d'un appareil.
- **Intervalle de rafraîchissement** : 1, 2 ou 5 minutes. Chaque rafraîchissement lit un tableau
  par gare suivie.

### Suivre une gare

1. **Chercher une gare** : tapez le début de son nom (« Milano », « Roma T », « Forlì »). La
   réponse liste les gares trouvées avec leur code, par exemple `[S01700]`. Viaggiatreno ne
   cherche que le début du nom.
2. **Suivre une gare** : tapez son nom complet ou son code. Filtres facultatifs :
   - **Catégorie de train** : régionaux seulement (REG, RV), Frecce seulement (Frecciarossa,
     Frecciargento, Frecciabianca) ou Intercity seulement (IC, ICN, EC, EN).
   - **Destination** : une partie de la destination des trains — `Napoli`, `Torino`, `Lecce`…
     Un nom qui correspond à plusieurs gares répond par leur liste : tapez le nom complet ou le
     code.
3. Ouvrez l'onglet **Découverte** et créez l'appareil.

Une même gare peut être suivie plusieurs fois avec d'autres filtres : chacune est un appareil.

### Retirer, vérifier l'état

- **Ne plus suivre une gare** : tapez le nom affiché par **État**. Son appareil reste dans Gladys
  jusqu'à ce que vous le supprimiez.
- **État** : les gares suivies, si leur appareil est créé, la dernière lecture de Viaggiatreno et
  la dernière erreur.

Un échec (rien trouvé, Viaggiatreno injoignable) s'affiche en rouge, une réussite en vert.

## Appareils

Chaque gare suivie a six fonctionnalités :

| Fonctionnalité                | Valeur                                                           |
| ----------------------------- | ---------------------------------------------------------------- |
| Prochain train                | minutes avant le prochain train qui circule ; 1440 sans annonce  |
| Train suivant                 | minutes avant celui d'après ; 1440 s'il n'y en a pas             |
| Retard du prochain train      | minutes de retard (un train en avance est à l'heure) ; 0 sinon   |
| Prochain train et destination | « 22:50 FR 9663 → Napoli Centrale », ou « Aucun train annoncé »  |
| Voie du prochain train        | la voie réelle si elle est connue, sinon la prévue ; « – » sinon |
| Trains supprimés              | le nombre de trains supprimés au tableau de la gare suivie       |

Les heures sont à l'heure italienne, retard compris. Un train supprimé n'est jamais « le prochain
train ». Un train dont l'heure est passée mais qui n'est pas encore parti compte comme partant
maintenant. Viaggiatreno ne donne le retard d'un train qu'une fois parti de son origine : avant,
il compte comme à l'heure. Entre deux lectures, les comptes à rebours continuent à partir de la
dernière réponse.

## Widgets de tableau de bord

**Prochains trains** : choisissez une gare suivie. Chaque ligne affiche l'heure et la destination,
puis l'attente, le train, sa voie et son retard : vert à l'heure, orange dès 3 minutes de retard,
rouge dès 10 ou s'il est supprimé. Réglages : le nombre de départs affichés (3 à 10), la légende et
les trains supprimés, tous deux masquables. Le titre est le nom de l'appareil dans Gladys.

## Déclencheurs de scène

- **Il est temps de partir** : un train part de la gare choisie dans le nombre de minutes choisi
  (1 à 30).
- **Train en retard** : un train au départ de la gare choisie atteint le retard choisi (5 à 60
  minutes).
- **Train supprimé** : un train au départ de la gare choisie est annoncé supprimé.

Chaque seuil se déclenche une fois par train. Rien ne se déclenche à la première lecture après un
démarrage : ce qui était déjà au tableau n'est pas une nouvelle. Variables : gare, destination,
catégorie, numéro du train, minutes d'attente, retard, heures prévue et théorique, voie.

## Actions de scène

**Obtenir les prochains trains** : pour une gare suivie, renvoie `sentence` (« REG 2986 pour
Saronno au départ de Milano Centrale : dans 3 min, voie 8, puis REG 2387 pour Voghera dans 13
min. »), `station_name`, `destination`, `category`, `train_number`, `minutes`,
`following_minutes`, `delay`, `expected_time`, `scheduled_time`, `platform` et `cancelled` (nombre
de trains supprimés). Sans train, `minutes` vaut 1440 et la phrase le dit.

## Exemples de scènes

- _Chaque jour de semaine à 7 h 30_ → **Obtenir les prochains trains** (Monza, Régional, →
  Milano) → envoyer `sentence` sur votre téléphone.
- **Il est temps de partir** (Roma Termini, Frecce → Napoli, 15 min) → l'annoncer sur une
  enceinte.
- **Train supprimé** (votre gare) → envoyer un message avec le numéro du train et son heure.

## Données, rafraîchissement et quotas

L'intégration lit, pour les appareils créés seulement, les départs de chaque gare (`partenze`, les
trains de la prochaine heure ou des deux prochaines) à l'intervalle choisi ; la recherche de gare
(`cercaStazione`, `regione`, `dettaglioStazione`) seulement quand vous cherchez ou ajoutez une
gare. Viaggiatreno ne publie ni quota ni conditions pour cet usage : réservez-le à un usage
personnel. Une requête par gare et par minute au plus reste un usage léger. Son CDN refuse les
requêtes sans User-Agent de navigateur (HTTP 403) : l'intégration en envoie un qui la nomme. Seul
`/data/watch.json` est écrit : les gares suivies et leurs filtres.

## Dépannage

- **Aucune valeur sur un nouvel appareil** : attendez le prochain rafraîchissement (une minute), ou
  consultez **État**.
- **« Viaggiatreno est illisible »** : le site est injoignable, refuse la requête (HTTP 403) ou
  répond une page d'erreur ; l'intégration réessaie à chaque rafraîchissement et les comptes à
  rebours continuent en attendant.
- **Un train manque** : il est parti, ou part dans plus d'une heure ou deux, ou ne correspond pas
  aux filtres de la gare suivie.
- **Logs** : réglez `LOG_LEVEL=debug` pour voir chaque lecture.

## Limites

- Les trains que montre Viaggiatreno : Trenitalia et les opérateurs régionaux du réseau RFI. Les
  trains Italo (NTV) ne sont pas couverts.
- Viaggiatreno est officieux et non documenté : un changement de son côté peut casser
  l'intégration jusqu'à une mise à jour.
- Les trains partiellement supprimés et les déviations sont affichés comme circulant.
- 10 gares suivies au plus. Les noms des fonctionnalités sont fixés à la création de l'appareil.

## Crédits

Données : [Viaggiatreno](http://www.viaggiatreno.it), RFI et Trenitalia. L'usage de ce service
suit l'intégration Home Assistant `viaggiatreno` (Apache 2.0). Logo de la couverture : Trenitalia
(marque de son propriétaire).
