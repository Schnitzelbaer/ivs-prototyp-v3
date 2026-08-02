import { Injectable, signal } from '@angular/core';

/**
 * Merkt sich, von welcher Übersicht ein Objekt geöffnet wurde — der
 * Back-Button im Objekt-Detail führt dorthin zurück, egal wie oft
 * innerhalb der Hierarchie gewechselt wurde. Standard ist das Dashboard
 * (z. B. bei Deep Links).
 */
@Injectable({ providedIn: 'root' })
export class HerkunftStore {
  readonly uebersicht = signal<'/dashboard' | '/objekte'>('/dashboard');
}
