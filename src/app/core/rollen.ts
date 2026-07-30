import { RolleId, WorkflowStatus } from './model';

export interface Rolle {
  id: RolleId;
  name: string;
  /** Im Rollenmenü wählbar sind nur die fünf fachlich relevanten Rollen. */
  waehlbar: boolean;
  /**
   * Rollenrelevante Stati: Objekte in diesen Stati erscheinen im Dashboard
   * der Rolle, und das Status-Dropdown der Zeilen bietet sie zur Wahl an —
   * die Stati, in denen die Rolle arbeitet, plus jene, die sie über ihre
   * Übergänge setzt (Ergebnis ihrer Arbeit).
   */
  relevanteStati: readonly WorkflowStatus[];
  /** Stati, in denen die Rolle Formularfelder bearbeiten darf. */
  editStati: readonly WorkflowStatus[];
}

export const ROLLEN: readonly Rolle[] = [
  {
    id: 'R-01',
    name: 'Alle Benutzer',
    waehlbar: false,
    relevanteStati: [],
    editStati: [],
  },
  {
    id: 'R-02',
    name: 'Technische Administration',
    waehlbar: false,
    relevanteStati: [],
    editStati: [],
  },
  {
    id: 'R-03',
    name: 'Fachliche Administration',
    waehlbar: true,
    // Freigabeprozess plus die Zuweisung neuer Arbeit
    relevanteStati: ['zugewiesen', 'in_bearbeitung', 'geprueft', 'freigegeben', 'publiziert'],
    editStati: [],
  },
  {
    id: 'R-04',
    name: 'Regionale Koordination',
    waehlbar: true,
    // koordiniert die Erfassung: alles, was bei den Inventarisierenden liegt,
    // plus deren Abgaben an die Prüfung
    relevanteStati: ['zugewiesen', 'in_bearbeitung', 'korrektur', 'bereit_zur_pruefung'],
    editStati: [],
  },
  {
    id: 'R-05',
    name: 'Inventarisierende',
    waehlbar: true,
    // eigene Arbeit plus die Abgabe an die Prüfung
    relevanteStati: ['zugewiesen', 'in_bearbeitung', 'korrektur', 'bereit_zur_pruefung'],
    editStati: ['zugewiesen', 'in_bearbeitung', 'korrektur'],
  },
  {
    id: 'R-06',
    name: 'Fachlektorat',
    waehlbar: true,
    // Prüfarbeit plus deren Ergebnis
    relevanteStati: ['bereit_zur_pruefung', 'in_pruefung', 'korrektur', 'geprueft'],
    // darf während der Prüfung editieren (Rollenbeschrieb: «Editieren»)
    editStati: ['bereit_zur_pruefung', 'in_pruefung'],
  },
  {
    id: 'R-07',
    name: 'Fachliche Prüfstelle',
    waehlbar: true,
    // übergreifende Prüfung während des Genehmigungsverfahrens
    relevanteStati: ['in_pruefung', 'geprueft', 'freigegeben'],
    editStati: [],
  },
  {
    id: 'R-08',
    name: 'System',
    waehlbar: false,
    relevanteStati: [],
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
