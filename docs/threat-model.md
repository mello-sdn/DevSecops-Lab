# Threat model — MERN DevSecOps Lab
*09/11/2026 · Document vivant, mis à jour à chaque phase. Chaque menace a un ID stable (Tn) référencé dans les commits, PR et tests.*

## Pourquoi ce document
Brancher des outils de sécurité ne suffit pas si on ne sait pas contre quoi on se protège.
Ici je liste les menaces que j'ai identifiées, le contrôle en place pour chacune, et ce qui
n'est pas encore couvert. Je couvre l'app, les images, la CI et le cluster kind ; pas mon
poste de dev ni la plateforme GitHub, que je suppose fiables.

## Ce que je cherche à protéger
- Les secrets : JWT, clé Stripe, webhook Discord
- Les données en base : utilisateurs (emails, mots de passe hashés), commandes
- L'intégrité des images : ce qui tourne doit être ce que j'ai construit et scanné

## Vue d'ensemble

    Dev ──push──> GitHub ──> CI (Gitleaks, Trivy) ──> images
    Utilisateur ──HTTP──> nginx ──> frontend / backend ──> MongoDB

## Menaces et contrôles

**STRIDE** : **S** usurpation · **T** altération · **R** répudiation · **I** fuite d'information · **D** déni de service · **E** élévation de privilèges

**Statut** :
- ✅ validé : le contrôle est en place
- 🟡 partiel : contrôle en place mais incomplet → ce qu'il reste à faire
- ❌ non couvert : aucun contrôle → ce qui est prévu

### Conteneurs (Docker)
| ID | STRIDE | Menace | Scénario concret | Contrôle (preuve) | Statut |
|---|---|---|---|---|---|
| T1 | E | Compromission d'un conteneur | Un attaquant exploite une faille de l'app et obtient un shell dans le conteneur. En root, il peut réécrire le code (server.js) pour y cacher une backdoor, installer des outils (apk add), et s'il s'échappe du conteneur il est root sur l'hôte (même UID 0) | `USER node` (backend), `nginx-unprivileged` (frontend, nginx), images alpine multi-stage, npm/npx retirés de l'image finale | 🟡 Le cluster n'oblige pas encore les conteneurs à tourner sans root → `securityContext` (non-root, FS en lecture seule), section Kubernetes |
| T2 | I / T | Accès non authentifié à la DB | MongoDB tourne sans authentification et le port 27017 est publié sur l'hôte : quiconque atteint ce port peut lire ou modifier les utilisateurs et les commandes | — | ❌ Aucune authentification sur la base → utilisateur et mot de passe dans un Secret, section Kubernetes |
| T3 | T | Modification de l'image de base | Un tag mutable (`node:26-alpine`) pointe un jour vers une autre image, plus vulnérable ou compromise, sans que je m'en rende compte | Images de base épinglées par digest (`@sha256:…`) dans les Dockerfiles et le compose : le contenu est immuable | ✅ |

### Pipeline (CI/CD)
| ID | STRIDE | Menace | Scénario concret | Contrôle (preuve) | Statut |
|---|---|---|---|---|---|
| T4 | I | Secret poussé en clair | Pour tester le paiement, je colle la clé Stripe (`sk_test_…`) directement dans le code du backend au lieu de passer par `process.env`, et je commit sans la retirer. Le `.gitignore` ne sert à rien, la clé est dans un fichier suivi, et même supprimée ensuite elle reste dans l'historique Git, avec la clé, n'importe qui peut appeler l'API Stripe du compte : créer ou rembourser des paiements | `.env` gitignoré, Gitleaks scanne tout l'historique (`fetch-depth: 0`) à chaque push et fait échouer le job | 🟡 Le secret est repéré seulement une fois poussé sur GitHub → hook pre-commit Gitleaks qui bloque le commit en local |
| T5 | E | Dépendance ou image vulnérable | Une CVE HIGH/CRITICAL (ex. RCE) dans une lib npm ou une image de base, exploitable à travers l'app | Trivy scanne les images backend, frontend et nginx (HIGH/CRITICAL) ; `script_alert.py` fait échouer la CI (`exit(1)`) et une alerte est envoyé sur Discord | 🟡 Trivy ne voit pas les libs npm du frontend (l'image finale ne contient que le bundle JS, sans `package-lock.json`), l'image Mongo n'est pas scannée et rien n'est rescanné sans push → scan du lockfile frontend (`trivy fs`), scan de l'image Mongo, scan planifié et Dependabot |

### Kubernetes
| ID | STRIDE | Menace | Scénario concret | Contrôle (preuve) | Statut |
|---|---|---|---|---|---|
|  |  |  |  |  |  |


