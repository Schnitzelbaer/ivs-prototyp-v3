import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideMapPin, lucidePlus, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import {
  BegehungsStore,
  BegehungsZiel,
  VERKEHRSMITTEL_LABEL,
  Verkehrsmittel,
} from '../core/begehungen';
import { ObjektStore } from '../core/objekt-store';

/**
 * Dialog «Begehung planen» (nur R-03, Entscheid 89): Logistik und die
 * Reihenfolge der Ziele — Objekte oder freie Kartenpunkte. Offene
 * Anforderungen lassen sich per Klick übernehmen und gelten nach dem
 * Speichern als eingeplant. Wird vom Begehungen-Tab und aus der
 * Objektbearbeitung heraus geöffnet — dort mit vorausgewähltem Objekt.
 */
@Component({
  selector: 'ivs-begehung-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
  ],
  providers: [
    provideIcons({ lucideArrowDown, lucideArrowUp, lucideMapPin, lucidePlus, lucideX }),
  ],
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
  /** Ziele samt Herkunft: aus einer Anforderung übernommene tragen deren Id. */
  protected readonly ziele = signal<(BegehungsZiel & { anforderungId: string | null })[]>([]);
  protected readonly neuesObjekt = signal('');
  /** Ids der in diese Begehung übernommenen Anforderungen. */
  protected readonly uebernommen = signal<ReadonlySet<string>>(new Set());

  protected readonly alleObjekte = computed(() =>
    [...this.objektStore.alle()].sort((a, b) =>
      a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }),
    ),
  );

  /** Offene Anforderungen, die sich übernehmen lassen. */
  protected readonly offeneAnforderungen = computed(() =>
    this.begehungsStore.anforderungen().filter((a) => a.begehungId === null),
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
        this.uebernommen.set(new Set());
        const start = this.vorauswahl();
        this.ziele.set(
          start ? [{ signatur: start, bezeichnung: '', position: null, anforderungId: null }] : [],
        );
      });
    });
  }

  protected zielName(ziel: BegehungsZiel): string {
    if (!ziel.signatur) return `Kartenpunkt: ${ziel.bezeichnung || 'ohne Bezeichnung'}`;
    const objekt = this.objektStore.bySignatur(ziel.signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : ziel.signatur;
  }

  protected objektHinzufuegen(): void {
    const signatur = this.neuesObjekt();
    if (!signatur || this.ziele().some((z) => z.signatur === signatur)) return;
    this.ziele.update((liste) => [
      ...liste,
      { signatur, bezeichnung: '', position: null, anforderungId: null },
    ]);
    this.neuesObjekt.set('');
  }

  /** Eine offene Anforderung als Ziel übernehmen. */
  protected anforderungUebernehmen(id: string): void {
    const anforderung = this.offeneAnforderungen().find((a) => a.id === id);
    if (!anforderung || this.uebernommen().has(id)) return;
    this.ziele.update((liste) => [
      ...liste,
      {
        signatur: anforderung.signatur,
        bezeichnung: anforderung.bezeichnung,
        position: anforderung.position,
        anforderungId: id,
      },
    ]);
    this.uebernommen.update((menge) => new Set(menge).add(id));
  }

  protected zielEntfernen(index: number): void {
    // Stammt das Ziel aus einer Anforderung, wird sie wieder frei —
    // sonst gälte sie beim Speichern fälschlich als eingeplant
    const entfernt = this.ziele()[index];
    if (entfernt?.anforderungId) {
      this.uebernommen.update((menge) => {
        const neu = new Set(menge);
        neu.delete(entfernt.anforderungId!);
        return neu;
      });
    }
    this.ziele.update((liste) => liste.filter((_, i) => i !== index));
  }

  protected verschieben(index: number, richtung: -1 | 1): void {
    this.ziele.update((liste) => {
      const ziel = index + richtung;
      if (ziel < 0 || ziel >= liste.length) return liste;
      const neu = [...liste];
      [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
      return neu;
    });
  }

  protected speichern(): void {
    if (!this.titel().trim() || this.ziele().length === 0) return;
    this.begehungsStore.hinzufuegen(
      {
        titel: this.titel().trim(),
        datum: this.datum() || new Date().toISOString().slice(0, 10),
        verkehrsmittel: this.verkehrsmittel(),
        unterkunft: this.unterkunft().trim() || '—',
        zeitbedarfStunden: this.zeitbedarf(),
        ziele: this.ziele().map(({ anforderungId: _weg, ...ziel }) => ziel),
      },
      [...this.uebernommen()],
    );
    this.offen.set(false);
  }
}
