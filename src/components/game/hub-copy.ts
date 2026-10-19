import type { Locale } from '@/lib/locale';

export const hubCopy = {
  en: {
    title: 'Choose your game.', label: 'THE ARCADE', back: 'Back to games',
    description: 'Pick a game below, open its page, and press play. Escape the city or enter the Backrooms — both run right in your browser.',
    pageTitle: 'Games — Zakaria Missou',
    drivingMode: 'Solo · Arcade driving', horrorMode: 'Solo / up to 4 players · Horror',
  },
  fr: {
    title: 'Choisissez votre jeu.', label: 'L’ARCADE', back: 'Retour aux jeux',
    description: 'Choisissez un jeu ci-dessous, ouvrez sa page et lancez la partie. Échappez-vous de la ville ou entrez dans les Backrooms, directement dans votre navigateur.',
    pageTitle: 'Jeux — Zakaria Missou',
    drivingMode: 'Solo · Conduite arcade', horrorMode: 'Solo / jusqu’à 4 joueurs · Horreur',
  },
  de: {
    title: 'Wähle dein Spiel.', label: 'DIE ARCADE', back: 'Zurück zu den Spielen',
    description: 'Wähle unten ein Spiel, öffne seine Seite und starte die Runde. Entkomme der Stadt oder betrete die Backrooms — direkt in deinem Browser.',
    pageTitle: 'Spiele — Zakaria Missou',
    drivingMode: 'Solo · Arcade-Rennspiel', horrorMode: 'Solo / bis zu 4 Spieler · Horror',
  },
} satisfies Record<Locale, Record<string, string>>;
