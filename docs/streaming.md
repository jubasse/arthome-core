# Arthome — plan média et diffusion

Complément au README de passation. Couvre le streaming : protocoles, plan de
contrôle contre plan média, abstraction de fournisseur, et le mode démonstration.

---

## 1. Le principe : deux plans strictement séparés

```
PLAN DE CONTRÔLE          NestJS / TypeScript
PLAN MÉDIA                infrastructure vidéo spécialisée
```

NestJS **pilote** la diffusion : cycle de vie d'un direct, clés de flux, droits,
chapitres posés en régie, incidents, billetterie, politique de rediffusion,
métriques métier.

NestJS ne **transcode ni ne segmente jamais** lui-même. Le traitement média est
du travail temps réel : il revient à des outils éprouvés (MediaMTX, FFmpeg,
fournisseur managé), pilotés par le code, jamais réimplémentés en JavaScript.

---

## 2. Protocoles

### Entrée

```
RTMP / RTMPS   compatibilité maximale (OBS, encodeurs)
SRT            contribution professionnelle, réseaux instables
WHIP           publication WebRTC depuis le navigateur
```

### Distribution publique

```
LL-HLS + CDN
```

HTTP, donc cacheable et distribuable. Compatible web, mobile et TV. Sur le web,
`hls.js` quand le navigateur n'a pas HLS natif.

**H.264 pour tout, au moins d'abord.** Le parc de téléviseurs connectés est trop
hétérogène ; HEVC et AV1 feraient perdre des appareils sans bénéfice visible aux
débits visés.

### Retour de régie

```
WebRTC / WHEP
```

Sous la seconde pour surveiller le plateau. **Le public n'a pas besoin de
WebRTC** : LL-HLS à quelques secondes suffit, et coûte infiniment moins cher.

```
OBS / encodeur
      │
 RTMPS / SRT / WHIP
      ▼
 Fournisseur média
      │
      ├── WebRTC/WHEP ──────────► Studio          latence sous la seconde
      │
      └── LL-HLS ──► CDN ───────► Storefront      web · mobile · TV
```

---

## 3. Abstraction de fournisseur

Arthome ne dépend d'aucun fournisseur. Des ports, dans le plan de contrôle :

```ts
interface LiveIngestProvider {}
interface PlaybackProvider {}
interface RecordingProvider {}
interface StreamingMetricsProvider {}
```

Aucun identifiant propre à un fournisseur ne traverse le domaine. Les capacités
sont déclarées explicitement — RTMP, SRT, WHIP, HLS, LL-HLS, WHEP, enregistrement,
DRM, restrictions géographiques — parce que tous les fournisseurs n'offrent pas
la même chose.

### Par environnement

| Environnement | Fournisseur |
|---|---|
| Tests | `FakeStreamingProvider` |
| Développement | `MediaMtxStreamingProvider` (docker-compose) |
| Démonstration simple | `FixtureStreamingProvider` — vidéo préenregistrée présentée comme un direct |
| Démonstration interactive | `SandboxMediaMtxProvider` — MediaMTX auto-hébergé, sans transcodage vidéo |
| Production | `CloudStreamingProvider` — Cloudflare Stream |

En production, un plan média managé plutôt qu'une ferme FFmpeg/GPU à entretenir :
Arthome possède le métier, pas les codecs.

---

## 4. Trois points où le domaine touche l'infrastructure

Ces trois-là ne sont pas des détails d'implémentation. Chacun mérite un ADR.

### La lecture signée, en périphérie

Un CDN devant le LL-HLS signifie que **ce n'est plus votre serveur média qui sert
les segments**. La vérification « cette personne détient une place » ne peut donc
plus se faire à la lecture.

```
@arthome/core   dit si la place est valide
service streaming   demande un jeton court au PlaybackProvider
client          renouvelle le jeton tant que la place tient
CDN             refuse tout ce qui n'est pas signé
```

Le port `PlaybackProvider` doit exposer cette capacité **explicitement** : un
fournisseur futur sans URL signées casserait la règle métier sans qu'on s'en
aperçoive.

### L'écran d'attente est un voile client, pas une bascule de flux

La régie peut diffuser un écran d'attente pendant un incident — c'est le parcours
à quatre temps de `Studio.dc.html`. Avec un fournisseur managé, basculer le flux
amont est lent et coûteux.

La solution juste : **le plan de contrôle publie un état d'incident, le lecteur
affiche l'écran d'attente par-dessus la vidéo.** Instantané, identique sur web,
mobile et TV, et le média reste intact pour la reprise. Le message écrit par la
régie voyage avec l'état.

### La fenêtre de rediffusion appartient au domaine

Le `RecordingProvider` stocke et supprime. C'est `@arthome/core` qui décide de la
durée de la fenêtre et de son inclusion dans le tarif. Sinon la politique de
rediffusion — celle qui justifie l'écart de prix — finirait encodée dans un cycle
de vie de stockage, hors de portée des tests.

Enregistrer **le flux maître à l'entrée**, pas seulement les variantes HLS : on
peut ainsi régénérer proprement les rediffusions.

---

## 5. Le tchat doit être ancré sur le temps média

Un message de tchat porte **sa position dans le média**, pas seulement son heure
d'envoi.

Sans cela, le tchat rejoué sur une rediffusion sera décalé de tout ce que le
spectateur a mis à lancer la lecture. Les maquettes prévoient des rediffusions
avec chapitres : le problème est certain.

Ça ne coûte rien si on y pense au départ. C'est irrattrapable ensuite.

**Frontière Kafka / Redis** : Kafka est le journal durable — modération, audit,
rejeu, historique. Redis assure la diffusion aux clients connectés (pub/sub comme
adaptateur Socket.IO). Confondre les deux est l'erreur classique.

---

## 6. Mode démonstration

Deux niveaux. Le premier est le chemin par défaut, le second le moment mémorable.

### Démonstration déterministe

Un flux préenregistré présenté comme un direct. Fonctionne immédiatement, sans
rien installer, sans coût. **C'est ce que voit un visiteur par défaut.**

### Démonstration interactive

Un visiteur authentifié diffuse réellement et voit son flux traverser toute la
plateforme. **Deux entrées vers le même plan média.**

**Parcours par défaut — le navigateur, en WHIP**

```
visiteur authentifié → « Tester une diffusion » → autorise caméra et micro
  → getUserMedia → publication WHIP vers MediaMTX
  → Studio affiche l'état À L'ANTENNE et les métriques
  → le Storefront lit le flux
```

Aucune installation, quelques secondes. **C'est ce parcours qu'on met en avant** :
personne n'installera OBS pour essayer une démonstration. C'est la différence
entre une démonstration que dix personnes essaient et une que tout le monde
essaie.

**Parcours avancé — OBS**, présenté comme une option et jamais comme un
prérequis : session créée, URL et identifiants temporaires, publication RTMPS,
SRT ou WHIP. Même aboutissement, workflow proche d'un usage professionnel.

Flux attendu dans les deux cas : H.264 *baseline*, 720p30, ~2 à 2,5 Mbps,
image-clé toutes les 2 s.

**Pas de fournisseur cloud sur ce mode** : la facturation à la minute livrée sur
une démonstration publique est un risque à ne pas prendre. MediaMTX auto-hébergé,
sans CDN.

### Contraintes de codec — le point qui fait échouer la démonstration

Sans transcodage vidéo, ce qui entre doit être directement remultiplexable en
HLS. Deux pièges :

**Vidéo — forcer H.264.** Un navigateur négociera volontiers VP8, VP9 ou AV1 en
WebRTC, et rien de cela ne se remultiplexe en HLS. Contraindre le SDP au H.264,
profil *baseline*. Prévoir un **échec explicite** : certains navigateurs et
appareils Android n'offrent pas d'encodeur H.264 matériel. Un message clair vaut
mieux qu'un flux qui n'arrive jamais — « votre navigateur ne peut pas diffuser en
H.264, essayez le parcours OBS ».

**Audio — Opus vers AAC, transcodage obligatoire.** Le navigateur émet de l'Opus
en WebRTC, par défaut et sans alternative. HLS attend de l'AAC : Safari et la
plupart des téléviseurs ne liront pas de l'Opus dans un conteneur HLS. Il faut
donc une **branche de transcodage audio seul** — négligeable en CPU face à la
vidéo, quelques pourcents d'un cœur par flux, mais indispensable. À vérifier sur
la version de MediaMTX retenue : selon les cas elle le fait seule, sinon c'est
une passe FFmpeg audio.

La chaîne n'est donc pas « aucun transcodage » mais **« aucun transcodage
vidéo »**. La nuance change tout : l'un est gratuit, l'autre ne l'est pas.

**La branche WHEP vers la régie garde l'Opus** : seule la branche HLS convertit.
La régie n'a aucun besoin d'AAC, et c'est le chemin le plus sensible à la
latence.

### Où atterrit le flux converti — la topologie décide de la latence

Deux montages possibles, un seul acceptable.

FFmpeg lit depuis MediaMTX et **produit lui-même le HLS** : on perd le muxeur
LL-HLS de MediaMTX et on récupère le HLS classique de FFmpeg. Le « quelques
secondes » devient huit, et l'argument de synchronisation du tchat s'effondre.

FFmpeg lit depuis MediaMTX, convertit l'audio, et **republie dans MediaMTX** sur
un second chemin. MediaMTX garde la main sur le LL-HLS. C'est celle-là.

```
WHIP → mediamtx/live/xxx          H.264 + Opus
         ├── WHEP ──────────────► Studio              sans transcodage
         └── FFmpeg ────────────► mediamtx/hls/xxx    vidéo copiée, audio AAC
                                      └── LL-HLS ───► Storefront
```

Sur la passe FFmpeg : `-c:v copy`, `-fflags nobuffer`, `-max_delay` bas. Sans
cela FFmpeg ajoutera son propre tampon, et l'on paiera en latence ce qu'on a
économisé en CPU.

**Règle générale du bac à sable : remultiplexer avant de transcoder.** Le
transcodage n'est introduit que là où la compatibilité l'exige — ici, l'audio, et
uniquement sur la branche HLS. En parcours OBS avec H.264 et AAC en entrée,
aucune passe n'est nécessaire : remultiplexage seul.

### Autorisation, cycle de vie, télémétrie — trois mécanismes distincts

```
Autorisation   authentification HTTP externe de MediaMTX → API NestJS
               synchrone, AVANT acceptation du flux
               vérifie : jeton, session, propriétaire, expiration, quota

Cycle de vie   crochets runOnOnline · runOnOffline · runOnRead · runOnUnread
               signalent l'état, ne décident de rien

Télémétrie     métriques Prometheus de MediaMTX
```

**Les crochets ne servent pas à autoriser.** `runOnConnect` est un événement de
cycle de vie ; l'autorisation passe par le mécanisme dédié, sans quoi un flux
peut entrer avant d'être refusé.

### Des métriques réelles, et honnêtes

Sans transcodage vidéo, les métriques de MediaMTX sont exposées directement. Les
indicateurs de la régie — débit entrant et sortant, paquets RTP, *jitter*,
lecteurs connectés, octets transférés, durée — **cessent d'être simulés et
deviennent de vraies mesures**. C'est exactement ce que la maquette promet ; le
dire explicitement dans le README.

Deux règles d'honnêteté :

- **Ne jamais présenter une métrique comme native si elle ne l'est pas.** La
  latence bout-en-bout demande une mesure dédiée — `RTCPeerConnection.getStats()`
  côté client, ou des horodatages applicatifs.
- **Adapter le tableau au protocole d'entrée.** Les paquets perdus et le *jitter*
  n'existent qu'en entrée WebRTC ; en RTMP, transporté sur TCP, ils n'ont pas de
  sens. Masquer ce qui n'est pas mesuré plutôt qu'afficher zéro : un zéro se lit
  « parfait », pas « non mesuré ».

### Le monitoring s'adapte au protocole d'entrée

WHEP n'est pas obligatoire pour toutes les sources. **Ne jamais créer une branche
média pour uniformiser un schéma** : une transformation ne se justifie que si
elle apporte une propriété mesurable — compatibilité, latence ou qualité.

```
Source WHIP (H.264 + Opus)
  → WHEP direct vers Studio : la sous-seconde est réellement accessible
  → branche audio Opus → AAC pour le Storefront uniquement

Source RTMPS/SRT (H.264 + AAC)
  → LL-HLS pour Studio ET Storefront : même sortie, aucun transcodage
```

Sur entrée RTMP, l'ingestion porte déjà une à trois secondes de latence : le
plancher est atteint avant la sortie. Transcoder AAC vers Opus pour obtenir un
WHEP qui ne sera jamais sous la seconde, c'est payer pour une promesse
inatteignable. La branche `monitor/{id}` ne se crée que si elle apporte un gain
mesuré.

### Cycle de vie des workers de compatibilité

Chaque flux nécessitant une représentation manquante engendre un processus
FFmpeg. **Ce sont des ressources de premier ordre**, à superviser comme telles.

**Démarrage et arrêt liés au cycle de vie MediaMTX** — `runOnOnline` démarre le
worker, la mise hors ligne l'arrête. Les crochets servent au cycle de vie, jamais
à l'autorisation.

**Délai de grâce à la mise hors ligne.** Une coupure réseau de deux secondes côté
salle fait passer `live/{id}` hors ligne puis en ligne : sans garde-fou, le
worker est tué et relancé, `playback/{id}` détruit et recréé, le manifeste HLS
repart de zéro — et tous les lecteurs connectés calent pour un simple accroc. On
ne tue donc le worker qu'après quelques secondes sans publieur, et un retour dans
ce délai le réutilise. C'est un cas distinct de l'échec du worker, et bien plus
fréquent.

**Supervision** — un worker ne doit jamais mourir en silence. Code de sortie,
signal, plantage remontent au domaine comme un incident (`COMPATIBILITY_WORKER_FAILED`)
pour que la régie affiche une cause explicite au lieu d'un lecteur qui ne démarre
jamais.

**Reprise bornée** — trois tentatives avec délai croissant, puis échec déclaré.
Jamais de redémarrage infini : un FFmpeg qui plante en boucle consomme la machine
sans rien produire.

**Ramasse-miettes** — il compare périodiquement les sessions vivantes et les
workers actifs. Un worker sans session est tué ; une session qui devrait avoir un
worker et n'en a pas déclenche un incident et une récupération contrôlée. Le
cycle de vie MediaMTX reste le mécanisme normal ; le ramasse-miettes est le filet.
**Ne jamais dépendre d'un seul mécanisme de nettoyage.**

### Quotas séparés par nature de ressource

Toutes les sessions n'ont pas le même coût : une entrée OBS déjà en H.264/AAC ne
consomme aucun CPU de transcodage, une entrée navigateur en consomme.

```
MAX_ACTIVE_STREAMS    connexions, mémoire, bande passante entrante
MAX_AUDIO_TRANSCODES  CPU, RAM, latence système
MAX_EGRESS_MBIT       bande passante sortante, coût du serveur
```

**`MAX_AUDIO_TRANSCODES` se mesure, il ne se choisit pas.** Banc d'essai sur
l'hôte réel — 1, 4, 8, 12 workers — puis observation du CPU, de la mémoire, de la
latence et de la stabilité. Machine confortable jusqu'à douze, dégradée à seize :
on retient huit ou dix. Le quota reflète la capacité réelle, pas un nombre
esthétique.

### Sécurité

Jamais anonyme. Plusieurs couches :

```
authentification · anti-bot (Turnstile) · limitation par IP
quota utilisateur · quota global · jeton de flux temporaire
chemins de flux aléatoires et non prédictibles
```

**Autorisation par crochets, pas par sondage** : `runOnConnect` et `runOnPublish`
de MediaMTX appellent l'API NestJS au moment de la publication — le jeton est
validé avant que le flux n'entre. Le sondage Prometheus reste utile pour
surveiller le débit et couper, pas pour autoriser.

### Quotas

```
1 flux actif par utilisateur          3 créations par jour
5 à 10 minutes par session            720p30, ~3 Mbps maximum
1 diffuseur, 1 ou 2 spectateurs       enregistrement désactivé
TTL ~15 minutes                       flux privé, non indexable
```

Et des plafonds globaux : `MAX_ACTIVE_STREAMS`, `MAX_DEMO_EGRESS`,
`MAX_DAILY_STREAM_MINUTES`, `MAX_CREATIONS_PER_MINUTE`. La démonstration n'a pas
vocation à monter en charge : capacité atteinte, on refuse ou on bascule sur la
démonstration préenregistrée.

Un **plafond de dépense au niveau du compte** du fournisseur, en plus des quotas
applicatifs. Ceinture et bretelles.

### Nettoyage

Toute ressource de démonstration est éphémère. Une session porte au minimum
`id`, `ownerId`, `createdAt`, `expiresAt`, `providerResourceId`, `status`.

Un ramasse-miettes périodique repère les sessions expirées, arrête le flux,
révoque les identifiants, supprime les ressources et nettoie les orphelins.
**Ne jamais dépendre de la fermeture propre du navigateur** ni d'un appel client
de fin de session.

---

## 7. Ce qu'Arthome possède, et ce qu'il ne réimplémente pas

**Arthome développe et possède** : cycle de vie des directs, droits, clés de flux,
orchestration, sécurité, billetterie, politique de rediffusion, métriques métier.

**Arthome ne réimplémente pas** : codecs, transcodage, mise en paquets HLS,
moteur de débit adaptatif, distribution CDN.

**Le plan média doit rester remplaçable sans toucher au domaine.**

---

## 8. Arbitrage assumé, à écrire dans le README

L'architecture ci-dessus est celle d'une vraie plateforme vidéo. En projet solo,
ce qui sera réellement construit : l'ingestion, la lecture LL-HLS, le retour de
régie en WHEP, le mode démonstration, les jetons signés. L'ingestion
multi-région, la ferme GPU et le multi-CDN resteront un schéma.

Ce n'est pas un manque. **Une architecture composable, documentée, instanciée au
minimum viable, avec un paragraphe expliquant ce qui n'a délibérément pas été
déployé et pourquoi**, envoie un signal plus fort qu'une tentative inachevée de
tout monter.
