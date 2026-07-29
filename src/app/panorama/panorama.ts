import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Platzhalter — 360°-Aufnahmen folgen in einer späteren Etappe. */
@Component({
  selector: 'ivs-panorama',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <h1 class="text-lg font-semibold">360°-Aufnahmen</h1>
      <p class="mt-2 text-sm text-muted-foreground">Folgt in einer späteren Etappe.</p>
    </div>
  `,
})
export class Panorama {}
