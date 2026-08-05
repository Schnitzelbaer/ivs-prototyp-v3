import { WorkflowStatus } from './model';

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  offen: 'Offen',
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
  'offen',
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
 * Signalfarbe je Status (Status-Punkte in Listen und Badges). Die Klassen
 * zeigen auf die --status-*-Tokens in styles.css und kippen im Dunkelmodus mit.
 */
export const STATUS_FARBE: Record<WorkflowStatus, string> = {
  offen: 'bg-status-offen',
  zugewiesen: 'bg-status-zugewiesen',
  in_bearbeitung: 'bg-status-in-bearbeitung',
  bereit_zur_pruefung: 'bg-status-bereit-zur-pruefung',
  in_pruefung: 'bg-status-in-pruefung',
  korrektur: 'bg-status-korrektur',
  geprueft: 'bg-status-geprueft',
  freigegeben: 'bg-status-freigegeben',
  publiziert: 'bg-status-publiziert',
};


