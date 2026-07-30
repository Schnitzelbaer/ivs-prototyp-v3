import { RolleId, StatusGruppe, WorkflowStatus } from './model';

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  zugewiesen: 'Zugewiesen',
  in_bearbeitung: 'In Bearbeitung',
  bereit_zur_pruefung: 'Bereit zur Prüfung',
  in_pruefung: 'In Prüfung',
  korrektur: 'Korrektur',
  geprueft: 'Geprüft',
  freigegeben: 'Freigegeben',
  publiziert: 'Publiziert',
};

export const ALLE_STATI: readonly WorkflowStatus[] = [
  'zugewiesen',
  'in_bearbeitung',
  'bereit_zur_pruefung',
  'in_pruefung',
  'korrektur',
  'geprueft',
  'freigegeben',
  'publiziert',
];

/**
 * Mapping der acht Stati auf die drei Dashboard-Gruppen.
 * Entscheid: Bereit zur Prüfung und In Prüfung zählen als «In Arbeit» —
 * das Objekt ist im Prozess unterwegs, auch wenn gerade eine andere Rolle
 * am Zug ist.
 */
export const STATUS_GRUPPE: Record<WorkflowStatus, StatusGruppe> = {
  zugewiesen: 'backlog',
  in_bearbeitung: 'in_arbeit',
  bereit_zur_pruefung: 'in_arbeit',
  in_pruefung: 'in_arbeit',
  korrektur: 'in_arbeit',
  geprueft: 'done',
  freigegeben: 'done',
  publiziert: 'done',
};

export const GRUPPE_LABEL: Record<StatusGruppe, string> = {
  backlog: 'Backlog',
  in_arbeit: 'In Arbeit',
  done: 'Done',
};

export const ALLE_GRUPPEN: readonly StatusGruppe[] = ['backlog', 'in_arbeit', 'done'];

/**
 * Signalfarbe je Status (Status-Punkte in Listen und Badges). Die Klassen
 * zeigen auf die --status-*-Tokens in styles.css und kippen im Dunkelmodus mit.
 */
export const STATUS_FARBE: Record<WorkflowStatus, string> = {
  zugewiesen: 'bg-status-zugewiesen',
  in_bearbeitung: 'bg-status-in-bearbeitung',
  bereit_zur_pruefung: 'bg-status-bereit-zur-pruefung',
  in_pruefung: 'bg-status-in-pruefung',
  korrektur: 'bg-status-korrektur',
  geprueft: 'bg-status-geprueft',
  freigegeben: 'bg-status-freigegeben',
  publiziert: 'bg-status-publiziert',
};

export interface StatusUebergang {
  von: WorkflowStatus;
  nach: WorkflowStatus;
  /** Beschriftung des Aktions-Buttons in der Objekt-Kopfzeile. */
  aktion: string;
}

/**
 * Erlaubte Statuswechsel je Rolle. Der jeweils erste passende Übergang
 * ist die Hauptaktion (Button in der Kopfzeile), weitere erscheinen nur
 * im Workflow-Status-Select des Formulars.
 */
export const UEBERGAENGE: Partial<Record<RolleId, StatusUebergang[]>> = {
  'R-05': [
    { von: 'zugewiesen', nach: 'in_bearbeitung', aktion: 'In Bearbeitung nehmen' },
    { von: 'in_bearbeitung', nach: 'bereit_zur_pruefung', aktion: 'Bereit zur Prüfung' },
    { von: 'korrektur', nach: 'in_bearbeitung', aktion: 'Korrektur aufnehmen' },
  ],
  'R-06': [
    { von: 'bereit_zur_pruefung', nach: 'in_pruefung', aktion: 'Prüfung beginnen' },
    { von: 'in_pruefung', nach: 'geprueft', aktion: 'Als geprüft kennzeichnen' },
    { von: 'in_pruefung', nach: 'korrektur', aktion: 'Zur Korrektur zurückweisen' },
  ],
  'R-03': [
    { von: 'geprueft', nach: 'freigegeben', aktion: 'Freigeben' },
    { von: 'freigegeben', nach: 'publiziert', aktion: 'Publizieren' },
    { von: 'zugewiesen', nach: 'in_bearbeitung', aktion: 'In Bearbeitung setzen' },
  ],
};

export function uebergaengeFuer(rolle: RolleId, status: WorkflowStatus): StatusUebergang[] {
  return (UEBERGAENGE[rolle] ?? []).filter((u) => u.von === status);
}

/**
 * Fachlicher Workflow-Graph (Abschnitt 7), unabhängig von Rollen — Grundlage
 * für das Status-Dropdown mit dem jeweils nächsten und vorherigen Status.
 */
const WORKFLOW_KANTEN: readonly { von: WorkflowStatus; nach: WorkflowStatus }[] = [
  { von: 'zugewiesen', nach: 'in_bearbeitung' },
  { von: 'in_bearbeitung', nach: 'bereit_zur_pruefung' },
  { von: 'bereit_zur_pruefung', nach: 'in_pruefung' },
  { von: 'in_pruefung', nach: 'geprueft' },
  { von: 'in_pruefung', nach: 'korrektur' },
  { von: 'korrektur', nach: 'in_bearbeitung' },
  { von: 'geprueft', nach: 'freigegeben' },
  { von: 'freigegeben', nach: 'publiziert' },
];

/** Nächstmögliche und vorherige Stati im Workflow-Graphen. */
export function nachbarStati(status: WorkflowStatus): {
  weiter: WorkflowStatus[];
  zurueck: WorkflowStatus[];
} {
  return {
    weiter: WORKFLOW_KANTEN.filter((k) => k.von === status).map((k) => k.nach),
    zurueck: WORKFLOW_KANTEN.filter((k) => k.nach === status).map((k) => k.von),
  };
}

/** Rollen, die einen bestimmten Übergang ausführen dürfen. */
export function rollenFuerUebergang(von: WorkflowStatus, nach: WorkflowStatus): RolleId[] {
  return (Object.entries(UEBERGAENGE) as [RolleId, StatusUebergang[]][])
    .filter(([, liste]) => liste.some((u) => u.von === von && u.nach === nach))
    .map(([rolle]) => rolle);
}
