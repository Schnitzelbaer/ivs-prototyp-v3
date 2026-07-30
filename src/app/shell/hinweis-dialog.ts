import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HinweisStore } from '../core/hinweis-store';

/**
 * Modal für den zentralen «Warum nicht?»-Hinweis (HinweisStore) — erklärt,
 * warum eine angeklickte Aktion gerade nicht möglich ist.
 */
@Component({
  selector: 'ivs-hinweis-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmDialogImports],
  template: `
    <hlm-dialog
      [state]="hinweis.aktueller() ? 'open' : 'closed'"
      (stateChanged)="$event === 'closed' && hinweis.schliesse()"
    >
      @if (hinweis.aktueller(); as eintrag) {
        <hlm-dialog-content *hlmDialogPortal class="max-w-md">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>{{ eintrag.titel }}</h3>
            <p hlmDialogDescription>{{ eintrag.text }}</p>
          </hlm-dialog-header>
          <hlm-dialog-footer>
            <button hlmBtn variant="outline" type="button" (click)="hinweis.schliesse()">
              Verstanden
            </button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      }
    </hlm-dialog>
  `,
})
export class HinweisDialog {
  protected readonly hinweis = inject(HinweisStore);
}
