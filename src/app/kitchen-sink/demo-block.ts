import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Rahmen für ein einzelnes Komponenten-Beispiel: Titel, optionale Notiz, Inhalt. */
@Component({
  selector: 'ks-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="scroll-mt-20" [id]="anchor()">
      <header class="mb-3">
        <h3 class="text-sm font-semibold tracking-tight">{{ title() }}</h3>
        @if (note()) {
          <p class="text-muted-foreground mt-0.5 text-xs">{{ note() }}</p>
        }
      </header>
      <div class="bg-card rounded-lg border p-5">
        <ng-content />
      </div>
    </section>
  `,
})
export class DemoBlock {
  public readonly title = input.required<string>();
  public readonly anchor = input<string>('');
  public readonly note = input<string>('');
}
