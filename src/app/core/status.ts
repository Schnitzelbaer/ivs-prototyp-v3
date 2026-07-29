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
