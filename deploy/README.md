# Héberger Takoyaki desu sur le VPS (Caddy)

L'appli est un site statique : Caddy sert le dossier `dist/`, GitHub Actions l'envoie à chaque push sur `main`.
GitHub Pages continue de marcher en parallèle tant qu'on ne le coupe pas.

## 1. Sur le VPS (une seule fois)

```sh
# Un utilisateur dédié, sans mot de passe, qui ne peut écrire que dans le dossier du site
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /srv/takoyaki-desu
sudo chown deploy:deploy /srv/takoyaki-desu
sudo apt install -y rsync   # si absent

# Une clé SSH réservée au déploiement (sur le VPS ou ailleurs, peu importe)
ssh-keygen -t ed25519 -N "" -C "github-deploy-takoyaki" -f ~/takoyaki_deploy
sudo mkdir -p /home/deploy/.ssh
sudo sh -c 'cat ~/takoyaki_deploy.pub >> /home/deploy/.ssh/authorized_keys'   # adapter le chemin si besoin
sudo chown -R deploy:deploy /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Caddy doit pouvoir lire `/srv/takoyaki-desu` (c'est le cas par défaut : dossiers en 755, fichiers en 644).

## 2. Caddy

Ajouter le bloc de [`Caddyfile`](Caddyfile) au Caddyfile du VPS, avec le vrai nom de domaine
(un enregistrement DNS A/AAAA doit pointer vers le VPS), puis :

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. GitHub

Dans le dépôt : Settings › Secrets and variables › Actions.

- Variables : `VPS_HOST` (l'IP ou le nom du VPS), et si besoin `VPS_USER` (défaut `deploy`), `VPS_PATH` (défaut `/srv/takoyaki-desu`), `VPS_PORT` (défaut 22).
- Secret : `VPS_SSH_KEY`, le contenu de la clé privée `~/takoyaki_deploy` (puis supprimer ce fichier du VPS).

Tant que `VPS_HOST` n'est pas défini, le déploiement VPS ne se lance pas. Ensuite : Actions › « Deploy to the VPS » › Run workflow pour le premier envoi.

## Bon à savoir

- Changer d'adresse fait repartir les données de zéro : la progression est stockée par site dans le navigateur.
  Avant de basculer, faire « M'envoyer ma sauvegarde » sur l'ancienne adresse, puis « Importer un fichier » sur la nouvelle.
- Le service worker est envoyé en dernier et jamais mis en cache par Caddy : les mises à jour arrivent au lancement suivant.
