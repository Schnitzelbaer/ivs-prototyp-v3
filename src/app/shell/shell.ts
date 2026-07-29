import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCamera,
  lucideChevronDown,
  lucideCircleCheck,
  lucideMoon,
  lucideRotateCcw,
  lucideRoute,
  lucideSun,
  lucideUser,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EinstellungenStore } from '../core/einstellungen-store';
import { RolleId } from '../core/model';
import { ObjektStore } from '../core/objekt-store';
import { ROLLEN } from '../core/rollen';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import { KarteSync } from '../karte/karte-sync';

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
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideBell,
      lucideCamera,
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
  private readonly sync = inject(KarteSync);
  private readonly router = inject(Router);

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
    this.einstellungen.rolleWechseln(id);
  }

  protected demodatenZuruecksetzen(): void {
    this.objektStore.zuruecksetzen();
  }
}
