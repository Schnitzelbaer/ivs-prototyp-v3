import { RolleId, WorkflowStatus } from './model';

export interface Rolle {
  id: RolleId;
  name: string;
  /** Im Rollenmenü wählbar sind nur die fünf fachlich relevanten Rollen. */
  waehlbar: boolean;
  /**
   * Stati, welche die Rolle über die Status-Dropdowns setzen darf.
   * «Korrektur» leitet allein das Fachlektorat ein; die
   * Inventarisierenden arbeiten zwar darin, setzen den Status aber
   * nicht selbst.
   */
  setzbareStati: readonly WorkflowStatus[];
  /** Stati, in denen die Rolle Formularfelder bearbeiten darf. */
  editStati: readonly WorkflowStatus[];
}

export const ROLLEN: readonly Rolle[] = [
  {
    id: 'R-01',
    name: 'Alle Benutzer',
    waehlbar: false,
    setzbareStati: [],
    editStati: [],
  },
  {
    id: 'R-02',
    name: 'Technische Administration',
    waehlbar: false,
    setzbareStati: [],
    editStati: [],
  },
  {
    id: 'R-03',
    name: 'Fachliche Administration',
    waehlbar: true,
    // Freigabeprozess plus die Zuweisung neuer Arbeit; «Offen» stellt ein
    // Objekt in den unzugewiesenen Pool zurück (Entscheid 79)
    setzbareStati: ['offen', 'zugewiesen', 'in_bearbeitung', 'geprueft', 'freigegeben', 'publiziert'],
    editStati: [],
  },
  {
    id: 'R-04',
    name: 'Regionale Koordination',
    waehlbar: true,
    // koordiniert die Erfassung: alles, was bei den Inventarisierenden liegt,
    // plus deren Abgaben an die Prüfung; «Offen» stellt ein Objekt in den
    // unzugewiesenen Pool zurück (Entscheid 79)
    // «Korrektur» leitet das Fachlektorat ein
    setzbareStati: ['offen', 'zugewiesen', 'in_bearbeitung', 'bereit_zur_pruefung'],
    editStati: [],
  },
  {
    id: 'R-05',
    name: 'Inventarisierende',
    waehlbar: true,
    // eigene Arbeit plus die Abgabe an die Prüfung
    // «Korrektur» leitet das Fachlektorat ein — R-05 arbeitet nur darin
    setzbareStati: ['zugewiesen', 'in_bearbeitung', 'bereit_zur_pruefung'],
    editStati: ['zugewiesen', 'in_bearbeitung', 'korrektur'],
  },
  {
    id: 'R-06',
    name: 'Fachlektorat',
    waehlbar: true,
    // Prüfarbeit plus deren Ergebnis
    setzbareStati: ['bereit_zur_pruefung', 'in_pruefung', 'korrektur', 'geprueft'],
    // darf während der Prüfung editieren (Rollenbeschrieb: «Editieren»)
    editStati: ['bereit_zur_pruefung', 'in_pruefung'],
  },
  {
    id: 'R-07',
    name: 'Fachliche Prüfstelle',
    waehlbar: true,
    // übergreifende Prüfung während des Genehmigungsverfahrens plus die
    // Publikation als deren Abschluss
    setzbareStati: ['in_pruefung', 'geprueft', 'freigegeben', 'publiziert'],
    editStati: [],
  },
  {
    id: 'R-08',
    name: 'System',
    waehlbar: false,
    setzbareStati: [],
    editStati: [],
  },
];

export function rolle(id: RolleId): Rolle {
  const r = ROLLEN.find((r) => r.id === id);
  if (!r) throw new Error(`Unbekannte Rolle: ${id}`);
  return r;
}

export function darfEditieren(id: RolleId, status: WorkflowStatus): boolean {
  return rolle(id).editStati.includes(status);
}
