/**
 * Registry der kommentierbaren Objekt-Attribute (09.03: Kommentare
 * referenzieren Attribute). `anker` ist die Element-Id im Objektformular —
 * ein Klick auf eine #Attribut-Referenz scrollt dorthin.
 */
export interface ObjektAttribut {
  key: string;
  label: string;
  anker: string;
}

export const OBJEKT_ATTRIBUTE: readonly ObjektAttribut[] = [
  { key: 'status', label: 'Workflow-Status', anker: 'attr-status' },
  { key: 'objektname', label: 'Objektname', anker: 'attr-name' },
  { key: 'nhg-wert', label: 'NHG-Wert', anker: 'attr-nhg' },
  { key: 'substanzgrad', label: 'Substanzgrad', anker: 'attr-substanzgrad' },
  { key: 'bauzeit', label: 'Bauzeit', anker: 'attr-bauzeit' },
  { key: 'bauherrschaft', label: 'Bauherrschaft', anker: 'attr-bauherrschaft' },
  { key: 'gemeinden', label: 'Gemeinden', anker: 'attr-gemeinden' },
  { key: 'aufnahmejahr', label: 'Aufnahmejahr', anker: 'attr-aufnahmejahr' },
  { key: 'geschichte-wertung', label: 'Bewertung Geschichte', anker: 'attr-bewertung-geschichte' },
  { key: 'morphologie', label: 'Bewertung Morphologie', anker: 'attr-bewertung-morphologie' },
  { key: 'substanzwert', label: 'Substanzwert', anker: 'attr-bewertung-substanzwert' },
  { key: 'erhaltungsziel', label: 'Erhaltungsziel', anker: 'attr-erhaltungsziel' },
  { key: 'gefahren', label: 'Gefahren / Massnahmen', anker: 'attr-gefahren' },
  { key: 'geschichte', label: 'Geschichte', anker: 'attr-geschichte' },
  { key: 'gelaende', label: 'Gelände', anker: 'attr-gelaende' },
  { key: 'bibliografie', label: 'Bibliografie', anker: 'attr-bibliografie' },
  { key: 'pruefkommentar', label: 'Prüfkommentar', anker: 'attr-pruefkommentar' },
];

export function attributVonLabel(label: string): ObjektAttribut | undefined {
  return OBJEKT_ATTRIBUTE.find((a) => a.label === label);
}
