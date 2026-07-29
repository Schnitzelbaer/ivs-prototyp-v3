import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Platzhalter — vollständige Objektübersicht (04.01), folgt nach Etappe 2. */
@Component({
  selector: 'ivs-objekte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <h1 class="text-lg font-semibold">Objekte</h1>
      <p class="mt-2 text-sm text-muted-foreground">Vollständige Objektübersicht — folgt.</p>
    </div>
  `,
})
export class Objekte {}
