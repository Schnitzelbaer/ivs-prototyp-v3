import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucidePlus } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { StammdatenStore } from '../core/stammdaten';

/**
 * Stammdatenverwaltung (02.01/02.02) — nur für die Fachliche Administration
 * (R-03, Guard auf der Route): Auswahllisten pflegen, Einträge umbenennen,
 * übersetzen (DE/FR/IT), deaktivieren und ergänzen. Werte werden inline
 * bearbeitet und automatisch gespeichert.
 */
@Component({
  selector: 'ivs-stammdaten',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgIcon, HlmBadgeImports, HlmButtonImports, HlmInputImports, HlmSwitchImports, HlmTooltipImports],
  providers: [provideIcons({ lucideChevronDown, lucidePlus })],
  templateUrl: './stammdaten.html',
})
export class Stammdaten {
  protected readonly store = inject(StammdatenStore);

  protected readonly eingeklappt = signal<ReadonlySet<string>>(new Set());
  protected readonly neueWerte = signal<Readonly<Record<string, string>>>({});

  protected listeUmschalten(id: string): void {
    this.eingeklappt.update((menge) => {
      const neu = new Set(menge);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  protected neuerWert(listeId: string): string {
    return this.neueWerte()[listeId] ?? '';
  }

  protected setzeNeuerWert(listeId: string, wert: string): void {
    this.neueWerte.update((w) => ({ ...w, [listeId]: wert }));
  }

  protected hinzufuegen(listeId: string): void {
    const wert = this.neuerWert(listeId).trim();
    if (!wert) return;
    this.store.eintragHinzufuegen(listeId, wert);
    this.setzeNeuerWert(listeId, '');
  }
}
