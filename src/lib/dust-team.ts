/** Dust people who can launch a campaign: picked from a list in the campaign creator. Add a line to add someone. */
export const DUST_TEAM: { group: string; names: string[] }[] = [
  {
    group: 'Go-to-market',
    names: [
      'Adele Dugre', 'Alexandre Casanova', 'Ali Kabbadj', 'Amelie Deltombe', 'Ankush Sehgal', 'Anya Andrews', 'Axel Gauvain',
      'Axel Gueret', 'Bruno Murray', 'Charlotte Comte', 'Clément Bruneau', 'Côme Lucien-Brun', 'Davis Jay Christenhuis',
      'Dini Mehta', 'Edouard Villette', 'Elia Kemp', 'Elias Nefzi', 'Ellen Woodcock', 'Faateh Dhillon', 'François Mossard',
      'Gaëlle Caplier', 'Gaëtan Gachet', 'Gianna Gard', 'Hasan Ansari', 'Ilias Bettahi', 'Iris Beraud', 'Josh Cohen',
      'Lauriane Paour', 'Lilibeth Acuna', 'Lily Guy', 'Louis Caulet', 'Louis-Nicolas Roussel', 'Léandre Le Bizec', 'Léna Caloud',
      'Margherita Zama', 'Martin Boudon', 'Matthieu Haguenauer', 'Maxence Garnier', 'Neyla Belmaachi', 'Nic Siegle',
      'Nicole Kreider', 'Okal Otieno', 'Pauline Pham', 'Plamédie Bola', 'Raphael Assaraf', 'Simon Bernat', 'Sophie Palmer',
      'Stephen Bronnec', 'Tarishi Singh', 'Theo Vanneufville', 'Thibault Martin', 'Thomas Vicaire', 'Ulysse Levallois',
      'Victor Blanc', 'Victor Pery', 'Vince Sarkisian', 'Yassine Hargane', 'Zach Friedland',
    ],
  },
  { group: 'Leadership', names: ['Gabriel Hubert', 'Nicolas Chinot', 'Stanislas Polu'] },
  {
    group: 'Operations & people',
    names: [
      'Alex Ritchie', 'Alexandre Cormerais', 'Ambra Zhang', 'Arthur Galy', 'Audrey Alcover', 'Elsa Béchour', 'Emilie Gomes da Mota',
      'Harry Rogers', 'Janet Gehrmann', 'Matthieu Mourey', 'Meaghan Shanley', 'Riwa Harfoush', 'Ru Chikwenengere',
      'Sandrine Vaillancourt', 'Stephanie Rhumeur', 'Theo Gantzer',
    ],
  },
];

/** "Louis-Nicolas Roussel" → first "Louis-Nicolas", last "Roussel"; "Léandre Le Bizec" → "Léandre", "Le Bizec". */
export const splitName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return { first: first ?? '', last: rest.join(' ') };
};
