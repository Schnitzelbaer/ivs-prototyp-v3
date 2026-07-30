import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCamera,
  lucideDatabase,
  lucideChevronDown,
  lucideCircleCheck,
  lucideMoon,
  lucideRotateCcw,
  lucideRoute,
  lucideSun,
  lucideUser,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BegehungsStore } from '../core/begehungen';
import { EinstellungenStore } from '../core/einstellungen-store';
import { GeometrieStore } from '../core/geometrie-store';
import { KommentarStore } from '../core/kommentare';
import { StammdatenStore } from '../core/stammdaten';
import { RolleId } from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { ROLLEN } from '../core/rollen';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import { HinweisStore } from '../core/hinweis-store';
import { KarteSync } from '../karte/karte-sync';
import { HinweisDialog } from './hinweis-dialog';

/**
 * App-Gerüst: schmale Icon-Leiste links, Inhalt rechts.
 *
 * Hinter dem IVS-Logo verbirgt sich das Rollenmenü (Klick öffnet es) —
 * der Rollen-Umschalter ist bewusst nicht als sichtbares Bedienelement
 * ausgeführt, damit er in Stakeholder-Demos nicht abgelenkt.
 */
@Component({
  selector: 'ivs-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmPopoverImports,
    HlmToasterImports,
    HlmTooltipImports,
    HinweisDialog,
  ],
  providers: [
    provideIcons({
      lucideBell,
      lucideCamera,
      lucideDatabase,
      lucideChevronDown,
      lucideCircleCheck,
      lucideMoon,
      lucideRotateCcw,
      lucideRoute,
      lucideSun,
      lucideUser,
    }),
  ],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly einstellungen = inject(EinstellungenStore);
  private readonly objektStore = inject(ObjektStore);
  private readonly kommentarStore = inject(KommentarStore);
  private readonly geometrieStore = inject(GeometrieStore);
  private readonly begehungsStore = inject(BegehungsStore);
  private readonly stammdatenStore = inject(StammdatenStore);
  private readonly sync = inject(KarteSync);
  private readonly router = inject(Router);
  private readonly hinweis = inject(HinweisStore);

  protected readonly rollen = ROLLEN;
  protected readonly personaName = NAME_FUER_ROLLE;

  constructor() {
    // Klick auf ein Objekt im separaten Kartenfenster → hier dorthin navigieren
    effect(() => {
      const klick = this.sync.objektKlickVonAussen();
      if (!klick) return;
      const objekt = this.objektStore.bySignatur(klick.signatur);
      if (objekt) void this.router.navigate(['/objekt', objekt.id]);
    });
  }

  protected rolleWaehlen(id: RolleId): void {
    const rolle = ROLLEN.find((r) => r.id === id);
    if (!rolle?.waehlbar) {
      // Nie-disabled-Regel: der Klick erklärt, warum die Rolle gesperrt ist
      this.hinweis.zeige(
        'Rolle nicht wählbar',
        `«${rolle?.name ?? id}» (${id}) ist im Prototyp nicht wählbar — der Rollen-Umschalter ` +
          'deckt die fünf fachlich relevanten Rollen R-03 bis R-07 ab (Vorgabe 5).',
      );
      return;
    }
    this.einstellungen.rolleWechseln(id);
  }

  protected demodatenZuruecksetzen(): void {
    this.objektStore.zuruecksetzen();
    this.kommentarStore.zuruecksetzen();
    this.geometrieStore.zuruecksetzen();
    this.begehungsStore.zuruecksetzen();
    this.stammdatenStore.zuruecksetzen();
    toast.success('Demodaten zurückgesetzt', {
      description: 'Alle Objekte, Kommentare, Geometrien und Begehungen wieder im Ausgangszustand.',
    });
  }
}
