import { RolleId, WorkflowStatus } from './model';

export interface Rolle {
  id: RolleId;
  name: string;
  /** Im Rollenmenü wählbar sind nur die fünf fachlich relevanten Rollen. */
  waehlbar: boolean;
  /** Stati, deren Objekte im Dashboard dieser Rolle als Aufgaben erscheinen. */
  dashboardStati: readonly WorkflowStatus[];
  /** Stati, in denen die Rolle Formularfelder bearbeiten darf. */
  editStati: readonly WorkflowStatus[];
}

export const ROLLEN: readonly Rolle[] = [
  {
    id: 'R-01',
    name: 'Alle Benutzer',
    waehlbar: false,
    dashboardStati: [],
    editStati: [],
  },
  {
    id: 'R-02',
    name: 'Technische Administration',
    waehlbar: false,
    dashboardStati: [],
    editStati: [],
  },
  {
    id: 'R-03',
    name: 'Fachliche Administration',
    waehlbar: true,
    // sieht, was auf Freigabe wartet oder freigegeben/publiziert ist
    dashboardStati: ['geprueft', 'freigegeben', 'publiziert'],
    editStati: [],
  },
  {
    id: 'R-04',
    name: 'Regionale Koordination',
    waehlbar: true,
    // koordiniert die Erfassung: alles, was bei den Inventarisierenden liegt
    dashboardStati: ['zugewiesen', 'in_bearbeitung', 'korrektur'],
    editStati: [],
  },
  {
    id: 'R-05',
    name: 'Inventarisierende',
    waehlbar: true,
    dashboardStati: ['zugewiesen', 'in_bearbeitung', 'korrektur'],
    editStati: ['zugewiesen', 'in_bearbeitung', 'korrektur'],
  },
  {
    id: 'R-06',
    name: 'Fachlektorat',
    waehlbar: true,
    dashboardStati: ['bereit_zur_pruefung', 'in_pruefung', 'korrektur'],
    // darf während der Prüfung editieren (Rollenbeschrieb: «Editieren»)
    editStati: ['bereit_zur_pruefung', 'in_pruefung'],
  },
  {
    id: 'R-07',
    name: 'Fachliche Prüfstelle',
    waehlbar: true,
    // übergreifende Prüfung während des Genehmigungsverfahrens
    dashboardStati: ['in_pruefung', 'geprueft', 'freigegeben'],
    editStati: [],
  },
  {
    id: 'R-08',
    name: 'System',
    waehlbar: false,
    dashboardStati: [],
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
