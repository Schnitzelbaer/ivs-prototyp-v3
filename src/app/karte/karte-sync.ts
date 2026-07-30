import { Injectable, OnDestroy, signal } from '@angular/core';
import { KartenSelektion } from './karte';

type Nachricht =
  | { typ: 'selektion'; selektion: KartenSelektion | null }
  | { typ: 'objekt-klick'; signatur: string }
  | { typ: 'anfrage' };

/**
 * Zustands-Synchronisation zwischen Hauptfenster und separatem Kartenfenster
 * («Karte und Beschrieb in separaten Fenstern») über einen BroadcastChannel.
 *
 * - Die Objektbearbeitung meldet ihre Selektion (`setzeSelektion`); der
 *   Service beantwortet Anfragen neu geöffneter Fenster automatisch.
 * - Das Kartenfenster wendet `selektionVonAussen` an und meldet Klicks auf
 *   Objekte zurück (`sendeObjektKlick`); die Shell navigiert dann dorthin.
 */
@Injectable({ providedIn: 'root' })
export class KarteSync implements OnDestroy {
  private readonly kanal = new BroadcastChannel('ivs-prototyp-v3.karte');

  /** Zuletzt von aussen empfangene Selektion (für das Kartenfenster). */
  readonly selektionVonAussen = signal<KartenSelektion | null>(null);
  /** Zuletzt von aussen gemeldeter Objekt-Klick (Signatur, für die Shell). */
  readonly objektKlickVonAussen = signal<{ signatur: string } | null>(null);

  /** Eigene, zuletzt gemeldete Selektion — Antwort auf Anfragen. */
  private eigeneSelektion: KartenSelektion | null = null;
  private hatEigeneSelektion = false;

  constructor() {
    this.kanal.onmessage = (ereignis: MessageEvent<Nachricht>) => {
      const nachricht = ereignis.data;
      switch (nachricht.typ) {
        case 'selektion':
          this.selektionVonAussen.set(nachricht.selektion);
          break;
        case 'objekt-klick':
          // Objektreferenz statt nur String, damit derselbe Klick zweimal
          // hintereinander ebenfalls ein Signal auslöst
          this.objektKlickVonAussen.set({ signatur: nachricht.signatur });
          break;
        case 'anfrage':
          if (this.hatEigeneSelektion) {
            this.kanal.postMessage({ typ: 'selektion', selektion: this.eigeneSelektion } satisfies Nachricht);
          }
          break;
      }
    };
  }

  ngOnDestroy(): void {
    this.kanal.close();
  }

  setzeSelektion(selektion: KartenSelektion | null): void {
    // identische Selektion nicht erneut senden — schützt das Kartenfenster
    // vor redundanten goTo-Läufen
    if (
      this.hatEigeneSelektion &&
      selektion?.signatur === this.eigeneSelektion?.signatur &&
      selektion?.ebene === this.eigeneSelektion?.ebene
    ) {
      return;
    }
    this.eigeneSelektion = selektion;
    this.hatEigeneSelektion = true;
    this.kanal.postMessage({ typ: 'selektion', selektion } satisfies Nachricht);
  }

  sendeObjektKlick(signatur: string): void {
    this.kanal.postMessage({ typ: 'objekt-klick', signatur } satisfies Nachricht);
  }

  frageSelektionAn(): void {
    this.kanal.postMessage({ typ: 'anfrage' } satisfies Nachricht);
  }
}
