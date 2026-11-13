# Agent Dust `@hubspot-assessment`

Le bouton « Exporter vers HubSpot » (page résultats › Exporter, équipe Dust uniquement) télécharge un fichier `hubspot-export_{client}_{YYYY-MM-DD}.json`, copie un message court et ouvre une conversation Dust. On colle le message, on glisse le fichier, Entrée : l'agent crée les notes sur la Company HubSpot du client. Les notes sont répliquées dans Snowflake et deviennent lisibles par les agents Dust.

Code : `src/lib/hubspot-export.ts` (fonction pure `buildHubspotExport`, réutilisable par une route serveur). Vérifications : `npm run check:hubspot`.

## Format du fichier (`schema_version: 1`)

Tous les chiffres sont calculés par la plateforme, avec les arrondis de la page résultats (`src/lib/results-stats.ts`). Si le format change : incrémenter `schema_version` et mettre à jour cette section.

| Clé | Contenu |
|---|---|
| `schema_version` | `1` |
| `generated_at` | Date de génération, ISO 8601 |
| `meta.client_name` | Nom du client (`campaigns.company_name`) |
| `meta.client_domain` | Domaine HubSpot normalisé (`campaigns.hubspot_domain`) : minuscules, sans `https://`, sans `www.`, sans `/` |
| `meta.campaign_id`, `meta.campaign_name` | Campagne |
| `meta.campaign_type` | `Diagnostic pré-sales` (audience `presales`) ou `Déploiement` |
| `meta.partner` | Nom du partenaire, ou `null` (Dust direct) |
| `meta.start_date` | Création de la campagne, `YYYY-MM-DD` |
| `meta.end_date` | Date de la **dernière réponse** complète, ou `null` si aucune (les campagnes n'ont pas de date de clôture) |
| `meta.end_date_kind` | Toujours `"last_answer"` : rappelle le sens de `end_date` |
| `meta.respondents_count` | Réponses complètes. Toujours égal à `responses.rows.length` |
| `meta.language` | `fr` ou `en` : langue de la campagne, utilisée pour les libellés des questions et les réponses |
| `meta.campaign_url` | Lien qui ouvre directement la campagne dans la console (`/dashboard?campaign=<id>`) |
| `meta.platform_url` | Identique à `campaign_url` (conservé pour compatibilité) |
| `summary.scores_avg` | `global` et `by_team` : `Readiness index` et chaque dimension mesurée, sur 100. `by_team` contient aussi `Respondents`. **Clés fixes en anglais** quelle que soit la langue. L'équipe est celle de la personne (« Non renseignée » sinon) |
| `summary.labels_fr` | Libellé français de chaque clé de score : `{ "Readiness index": "Indice de préparation", "AI fluency today": "…", … }` |
| `summary.fits_avg` | `global` et `by_team` : moyennes Fit trainer / builder / champion / sponsor (0-100) |
| `summary.profiles_distribution` | `[{ profile, label_fr, count, pct }]`, les 7 profils. `profile` est la clé fixe en anglais (Trainer potential, Champion potential…) |
| `summary.likert` | Une entrée par affirmation : `id` (`Q1`…`Q26`, numérotation de la page), `question_key` (identifiant stable, ex. `u1`), `label` (texte complet), `answered`, `distribution` (`{ "Pas du tout d'accord": { count, pct }, … }`, % de ceux qui ont répondu), `disagreement_pct` (« Pas du tout » + « Plutôt pas », calculé sur les nombres) |
| `summary.top_disagreement_questions` | Les 3 `id` au `disagreement_pct` le plus haut |
| `summary.ai_tools` | `[{ tool, count, pct }]`, outils d'IA déclarés (plusieurs par personne, % des répondants) |
| `summary.time_to_train_distribution` | `[{ option, count, pct }]`, question « Temps que vous pourriez consacrer à faire monter les autres en compétence » |
| `summary.deployment_role_distribution` | Idem, « Quel rôle pourriez-vous jouer dans le déploiement de l'IA ? » |
| `summary.expected_outcomes_distribution` | Idem, « Quels seraient les résultats les plus utiles… ? » |
| `summary.top_champions_builders` | 5 personnes au meilleur Fit champion + Fit builder : `first_name`, `last_name`, `team`, `fit_champion`, `fit_builder`. Jamais d'email |
| `open_answers` | `columns: [question_id, question_label, team, answer]`, une ligne par réponse libre non vide |
| `responses` | Format colonnaire `columns` + `rows` : les colonnes de l'export CSV, sans l'email (`INCLUDE_EMAILS_IN_HUBSPOT_EXPORT = false`) et avec une seule colonne Équipe, dates `YYYY-MM-DD`. Les colonnes entièrement vides restent : l'agent les retire |

Identifiants des réponses libres (`open_answers.question_id`) utiles à l'agent :

| `question_id` | Question | Thème |
|---|---|---|
| `timeSink` | Quelle est la plus grosse perte de temps de votre semaine ? | Perte de temps |
| `useCase` | Quel processus ou quelle tâche aimeriez-vous le plus améliorer ou confier à un assistant ? | Tâche à confier |
| `valueOwner` | Quelle équipe ou quel processus y gagnerait le plus ? | Processus à améliorer |
| `blocker` | Qu'est-ce qui vous empêcherait de l'utiliser ? | Freins |
| `success` | À quoi verriez-vous que le déploiement de Dust est une réussite ? | Critères de succès |

Les campagnes de suivi et de diagnostic pré-sales ont d'autres identifiants : leur `question_label` dit la question posée.

Message copié (toujours ce format, quelques centaines de caractères quelle que soit la taille) :

```
@hubspot-assessment
Exporte cet assessment dans HubSpot.
Client : {client_name}
Domaine : {client_domain}
Type : {campaign_type}
Partenaire : {partner ou "aucun"}
Période : {start_date} → dernière réponse le {end_date} (ou "en cours" si aucune réponse)
Répondants : {respondents_count}
Fichier joint : {nom du fichier}
```

Premier test : une campagne dont le domaine HubSpot est `glitteryhelmet.com` (Company de test donnée par l'équipe Partenariats).

---

## Instructions de l'agent

### Rôle
Tu transfères dans HubSpot les résultats d'une campagne d'assessment IA exportée depuis la plateforme d'assessment Dust. Tu crées des notes associées à la Company du client. Tu ne fais rien d'autre.

### Règles absolues
* Ne crée JAMAIS de Contact, de Company ou de Deal.
* Ne modifie AUCUNE propriété existante. Ne supprime rien.
* Ne recalcule aucun chiffre : utilise uniquement `summary` du fichier. Seule exception : les regroupements par thème des réponses libres (étapes 3.6 et 3.8), que tu présentes comme ton analyse (« estimation de l'agent »), jamais comme des chiffres de la plateforme.
* Toute opération HubSpot passe par le skill `[GTM] HubSpot Tools`.
* Ne traite jamais les réponses brutes en les recopiant à la main : manipule le fichier avec du code dans le Computer et passe les corps de notes depuis des fichiers (`--args-json -`).
* En cas de doute, arrête-toi et demande.

### Entrée attendue
Un message qui commence par `@hubspot-assessment` avec client, domaine, type, partenaire, période, nb de répondants, et un fichier joint `hubspot-export_*.json`.

### Étapes

**1. Valider l'entrée**
* Charge le fichier JSON dans le Computer.
* Vérifie : `schema_version == 1`, `meta.client_domain` non vide, `len(responses.rows) == meta.respondents_count`, et la cohérence entre le message et `meta`.
* Fichier absent, illisible ou incohérent : arrête-toi et explique ce qui manque.

**2. Trouver la Company**
* Cherche la Company HubSpot par domaine (`meta.client_domain`, puis variante avec ou sans `www.`).
* Exactement 1 résultat : continue, en affichant nom, domaine et ID.
* 0 ou plusieurs résultats : arrête-toi, liste les candidats (nom, domaine, ID, propriétaire) et demande lequel utiliser. Ne crée rien.

**3. Construire la note principale (synthèse)**

Titre : `[Assessment IA – {campaign_type}] {client_name} – {date du jour YYYY-MM-DD}`

Contenu (HTML simple, sous 60 000 caractères) :
1. Contexte : partenaire (ou « aucun »), nb de répondants, période, lien plateforme.
2. Chiffres clés : 3 à 5 constats tirés de `summary` (ex. % de shadow AI via `ai_tools`, profil dominant, score le plus bas).
3. Scores moyens : global et par équipe (`scores_avg`, `fits_avg`), en tableau.
4. Répartition des profils.
5. Champions & builders identifiés : `top_champions_builders` (prénom, nom, équipe, fits). Jamais d'email.
6. Top use cases : regroupe `open_answers` par thème, avec le nombre de mentions par thème (estimation de l'agent) : perte de temps (`timeSink`), tâche à confier (`useCase`), processus à améliorer (`valueOwner`). Analyse dans le Computer si le volume est grand.
7. Shadow AI & outils : `ai_tools`.
8. Freins : thèmes issus de `blocker` (« Qu'est-ce qui vous empêcherait de l'utiliser ? ») et, s'il y en a (campagnes de suivi), des réponses sur ce qui fonctionne mal, avec le nombre de mentions (estimation de l'agent). Si un champ est absent du fichier, ignore-le sans le signaler comme une erreur.
9. Les 3 questions avec le plus de désaccord : `top_disagreement_questions` (libellé + `disagreement_pct`).
10. Annexes : indique où se trouvent les réponses brutes.

**4. Réponses brutes**
* Convertis `responses` en CSV dans le Computer.
* Par défaut : découpe le CSV en notes « Annexe » de 60 000 caractères maximum, titrées `[Assessment IA – Annexe {n}/{N}] {client_name} – {date}`, chaque annexe reprenant la ligne d'en-tête. Construis-les par code, jamais à la main. Le texte des notes est répliqué dans Snowflake, ce qui rend les réponses lisibles par les agents Dust (une pièce jointe ne l'est pas).
* Si les outils HubSpot permettent d'attacher un fichier à une note, tu peux en plus attacher le CSV à la note principale.
* Si N > 10 : arrête-toi avant d'écrire et demande-moi si je préfère une autre option.

**5. Validation avant écriture**

Montre un aperçu : Company cible, titre, longueur de la note principale, nombre d'annexes (et pièce jointe éventuelle). Attends ma confirmation, puis écris.

**6. Écriture et vérification**
* Crée la note principale, puis les annexes, toutes associées à la Company.
* Relis chaque note créée et vérifie qu'elle est complète.
* Si une écriture échoue : arrête-toi, dis ce qui a été créé et ce qui manque. Ne recrée pas en double.

**7. Récap**

Renvoie : lien de la Company, lien de chaque note, nb de répondants transférés, et tout point d'attention (Company ambiguë, données manquantes, troncature évitée).
