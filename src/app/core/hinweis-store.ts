import { Injectable, signal } from '@angular/core';

/**
 * Zentraler «Warum nicht?»-Hinweis. Gemäss Regel aus dem Review zeigt der
 * Prototyp nie ausgegraute Bedienelemente: Ist eine Aktion nicht möglich,
 * bleibt das Element aktiv und der Klick erklärt in einem Modal, warum
 * nicht. Der Dialog dazu liegt in der Shell (hinweis-dialog.ts) und im
 * separaten Kartenfenster.
 */
@Injectable({ providedIn: 'root' })
export class HinweisStore {
  readonly aktueller = signal<{ titel: string; text: string } | null>(null);

  zeige(titel: string, text: string): void {
    this.aktueller.set({ titel, text });
  }

  schliesse(): void {
    this.aktueller.set(null);
  }
}
