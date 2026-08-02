import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideCalendarPlus,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BegehungsStore, VERKEHRSMITTEL_LABEL, darfBegehungPlanen } from '../core/begehungen';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HerkunftStore } from '../core/herkunft-store';
import { HinweisStore } from '../core/hinweis-store';
import { ObjektStore } from '../core/objekt-store';
import { BegehungDialog } from '../panorama/begehung-dialog';

/**
 * Begehungen (eigener Tab, losgelöst von den 360°-Aufnahmen): Liste aller
 * geplanten Feldeinsätze mit Reihenfolge und Logistik. Planen, Umstellen
 * und Löschen ist den Rollen R-03, R-04, R-06 und R-07 vorbehalten —
 * andere sehen alles, der Klick erklärt die Sperre (nie-disabled-Regel).
 */
@Component({
  selector: 'ivs-begehungen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmBadgeImports, HlmButtonImports, HlmTooltipImports, BegehungDialog],
  providers: [
    provideIcons({ lucideArrowDown, lucideArrowUp, lucideCalendarPlus, lucideTrash2 }),
  ],
  templateUrl: './begehungen.html',
})
export class Begehungen {
  protected readonly begehungsStore = inject(BegehungsStore);
  private readonly store = inject(ObjektStore);
  private readonly einstellungen = inject(EinstellungenStore);
  private readonly hinweis = inject(HinweisStore);
  private readonly herkunft = inject(HerkunftStore);
  private readonly router = inject(Router);

  protected readonly verkehrsmittelLabel = VERKEHRSMITTEL_LABEL;
  protected readonly begehungOffen = signal(false);

  /** Prüft das Planungsrecht; ohne Recht erklärt ein Modal die Sperre. */
  private darfPlanen(): boolean {
    if (darfBegehungPlanen(this.einstellungen.aktiveRolleId())) return true;
    this.hinweis.zeige(
      'Begehungsplanung nicht möglich',
      `Begehungen planen können die Fachliche Administration (R-03), die Regionale ` +
        `Koordination (R-04), das Fachlektorat (R-06) und die Fachliche Prüfstelle (R-07) — ` +
        `nicht die Rolle «${this.einstellungen.aktiveRolle().name}».`,
    );
    return false;
  }

  protected begehungPlanen(): void {
    if (this.darfPlanen()) this.begehungOffen.set(true);
  }

  protected loeschen(id: string): void {
    if (this.darfPlanen()) this.begehungsStore.loeschen(id);
  }

  protected verschieben(id: string, index: number, richtung: -1 | 1): void {
    if (this.darfPlanen()) this.begehungsStore.verschieben(id, index, richtung);
  }

  protected oeffneObjekt(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (!objekt) return;
    this.herkunft.uebersicht.set('/dashboard');
    void this.router.navigate(['/objekt', objekt.id]);
  }

  protected objektName(signatur: string): string {
    const objekt = this.store.bySignatur(signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : signatur;
  }

  protected formatDatum(iso: string): string {
    const [j, m, t] = iso.split('-');
    return `${t}.${m}.${j}`;
  }
}
