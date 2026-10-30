# MERN DevSecOps Lab

Ce dépôt regroupe mon lab DevSecOps. L'idée est simple : prendre une stack MERN classique et la pousser en production sur Kubernetes en appliquant une sécurité stricte à chaque étape (moindre privilège et défense en profondeur), plutôt que de patcher la sécurité à la fin.

---

## Feuille de Route
Le projet avance par blocs logiques. Je valide un pilier technique avant de passer au suivant :
- [x] **1) Sécuriser les conteneurs (Docker)** -> *Optimisation du poids des images et suppression des privilèges root.*
- [x] **2) Automatiser les contrôles (CI/CD)** -> *Standardisation des builds et scans de vulnérabilités à chaque commit.*
- [ ] **3) Orchestrer sur Kubernetes** -> *Déploiement durci sur un cluster kind (en cours).*

---

## Choix & Retours d'expérience
### Container Hardening et Multi-Stage Builds
* **Le problème :** Mon image de base (Ubuntu) faisait plus d'1 Go et tournait par défaut en `root`. Cela posait un double problème : des temps de build/déploiement trop longs en CI/CD et une plus grande surface d'attaque
* **Ma solution :** Passage au *Multi-stage build*, ajout d'un USER non root et côté frontend utilisation d'une image nginx avec moins de privilèges
* **Bilan :** Les images finales pèsent 317mo(backend), 103mo(frontend), 91.3mo(nginx), ce qui accélère drastiquement le déploiement. Côté sécurité, l'absence d'outils (`curl`, `apt`, `bash`) et l'exécution en `USER nonroot` réduisent fortement ce qu'un attaquant peut faire dans un container

### Pipeline CI/CD et sécurité "Shift-Left"
* **Le problème :** Devoir lancer les tests unitaires, le build et le scan des images à la main à chaque modification devenait vite long et source d'erreurs
* **Ma solution :** Automatisation complète du cycle via **GitHub Actions** en plaçant la sécurité dès le début du flux. La pipeline intègre un détecteur de secrets (`Gitleaks`) et un scanner d'images (`Trivy`)
* **Bilan :** Chaque push ou nouvelle feature déclenche automatiquement les tests et le build des images, ce qui offre un gain de temps considérable. Niveau sécurité, la pipeline agit comme une barrière : si un secret est détecté ou qu'une CVE de niveau *High* ou *Critical* est trouvée, une notification est envoyée sur Discord grâce à un script qui parse les logs trivy et la CI s'arrête net
<img width="40%" alt="Discord CI Alert" src="https://github.com/user-attachments/assets/30e0f470-55b1-4d33-81c0-f204f8f09ffd" />

### Kubernetes et orchestration
*En cours*

---

## Documentation
- [Threat model](docs/threat-model.md) — contre quoi je me protège *En cours*
---
