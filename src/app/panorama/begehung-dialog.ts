import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucidePlus, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { BegehungsStore, VERKEHRSMITTEL_LABEL, Verkehrsmittel } from '../core/begehungen';
import { ObjektStore } from '../core/objekt-store';

/**
 * Dialog «Begehung planen»: Logistik (Verkehrsmittel, Unterkunft,
 * Zeitbedarf) und die Reihenfolge der zu begehenden Objekte. Wird von der
 * 360°-Seite und aus der Objektbearbeitung heraus geöffnet — dort mit
 * vorausgewähltem Objekt.
 */
@Component({
  selector: 'ivs-begehung-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
  ],
  providers: [provideIcons({ lucideArrowDown, lucideArrowUp, lucidePlus, lucideX })],
  templateUrl: './begehung-dialog.html',
})
export class BegehungDialog {
  private readonly begehungsStore = inject(BegehungsStore);
  private readonly objektStore = inject(ObjektStore);

  /** Zwei-Weg: Dialog offen. */
  readonly offen = model(false);
  /** Signatur, die beim Öffnen bereits auf der Liste steht. */
  readonly vorauswahl = model<string | null>(null);

  protected readonly verkehrsmittelLabel = VERKEHRSMITTEL_LABEL;

  protected readonly titel = signal('');
  protected readonly datum = signal('');
  protected readonly verkehrsmittel = signal<Verkehrsmittel>('zu_fuss');
  protected readonly unterkunft = signal('');
  protected readonly zeitbedarf = signal<number | null>(null);
  protected readonly objekte = signal<string[]>([]);
  protected readonly neuesObjekt = signal('');

  protected readonly alleObjekte = computed(() =>
    [...this.objektStore.alle()].sort((a, b) => a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true })),
  );

  constructor() {
    // Beim Öffnen zurücksetzen und die Vorauswahl übernehmen
    effect(() => {
      if (!this.offen()) return;
      untracked(() => {
        this.titel.set('');
        this.datum.set('');
        this.verkehrsmittel.set('zu_fuss');
        this.unterkunft.set('');
        this.zeitbedarf.set(null);
        this.neuesObjekt.set('');
        const start = this.vorauswahl();
        this.objekte.set(start ? [start] : []);
      });
    });
  }

  protected objektName(signatur: string): string {
    const objekt = this.objektStore.bySignatur(signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : signatur;
  }

  protected objektHinzufuegen(): void {
    const signatur = this.neuesObjekt();
    if (!signatur || this.objekte().includes(signatur)) return;
    this.objekte.update((liste) => [...liste, signatur]);
    this.neuesObjekt.set('');
  }

  protected objektEntfernen(index: number): void {
    this.objekte.update((liste) => liste.filter((_, i) => i !== index));
  }

  protected verschieben(index: number, richtung: -1 | 1): void {
    this.objekte.update((liste) => {
      const ziel = index + richtung;
      if (ziel < 0 || ziel >= liste.length) return liste;
      const neu = [...liste];
      [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
      return neu;
    });
  }

  protected speichern(): void {
    if (!this.titel().trim() || this.objekte().length === 0) return;
    this.begehungsStore.hinzufuegen({
      titel: this.titel().trim(),
      datum: this.datum() || new Date().toISOString().slice(0, 10),
      verkehrsmittel: this.verkehrsmittel(),
      unterkunft: this.unterkunft().trim() || '—',
      zeitbedarfStunden: this.zeitbedarf(),
      objekte: this.objekte(),
    });
    this.offen.set(false);
  }
}
