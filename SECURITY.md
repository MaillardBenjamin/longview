# Politique de sécurité

## Signaler une vulnérabilité

La sécurité de LongView est importante. Si vous découvrez une vulnérabilité de sécurité :

1. **Ne pas ouvrir d’issue publique** sur le dépôt GitHub/GitLab.
2. **Contacter directement** l’éditeur par email : **contact@oenotrac.fr**.
3. **Décrire** la vulnérabilité de manière précise (étapes de reproduction, impact potentiel).
4. **Attendre** un accusé de réception et, le cas échéant, des instructions pour une divulgation coordonnée.

Nous nous engageons à répondre dans un délai raisonnable et à vous tenir informé des suites données.

## Versions supportées

Seules les versions récentes du projet font l’objet de correctifs de sécurité. Merci de mettre à jour vers la dernière version avant de signaler un problème.

## Bonnes pratiques

- Ne commitez jamais de secrets (clés API, mots de passe, `SECRET_KEY`) dans le code.
- Utilisez des variables d’environnement pour toute donnée sensible.
- En production, définissez une `SECRET_KEY` forte et unique (voir [DEPLOIEMENT.md](documentation/DEPLOIEMENT.md)).

## Remerciements

Les contributeurs qui nous aident à corriger des vulnérabilités de manière responsable peuvent être remerciés dans ce fichier (avec leur accord).
