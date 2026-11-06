# Hibou Soutienscolaire

Contexte : un agent qui aide les collégiens à faire leur devoirs, sans les faire à leur place

Interface : une interface facile à utiliser, pensée pour les collégiens et assez ressemblante à celle de ChatGPT. Mettre un mode sombre (Noir) et un mode clair (Blanc)

Modes : menu déroulant de changement de mode à côté du bouton « vocal »
Générer - générer des quiz, des flashcards, des exercices, etc…
Réviser - réviser pour une évaluation ou un test
Organiser - organiser les devoirs en les classant (+ prioritaire, - prioritaire) et en donnant une estimation de leur temps.
Expliquer - expliquer un devoir, une erreur, donner une méthode…

IMPORTANT : L’AGENT NE DOIT JAMAIS DONNER LA RÉPONSE

Language : l’agent doit parler gentiment, avec du vocabulaire d’ado. Les mots peuvent être définis dans les paramètres (ex : Bonjour = Salut)

Compte : l’application ne s’utilise pas sans compte. Les comptes ont un large choix de préférences pour personnaliser l’agent. La création du compte demande l’e-mail, le prénom, le nom, le prénom que l’agent va utiliser pour nommer l’utilisateur, la classe et l’âge. N’importe quelle personne, de n’importe quel âge, peut utiliser l’agent. Les exercices et les méthodes données doivent s’adapter à son âge et à sa classe. La création d’un compte est gratuite.

Images : l’importation d’image peut être possible pour que l’utilisateur puisse demander à l’agent d’expliquer un exercice ou d’organiser ses devoirs.

Vocaux : aussi permettre des vocaux

Fautes : si l’utilisateur fait une faute à son prompt, l’agent répond, mais lui dit que il a fait une faute et lui donne la correction (en paratexte)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hibou-soutienscolaire.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8aae79db-ffce-4cf2-9eb5-b1d6619596ab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
