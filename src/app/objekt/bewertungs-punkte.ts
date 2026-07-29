import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Punktewertung 0–4 für die Schutzbegründung (NHG 5.1.b), dargestellt als
 * vier Kreise plus Löschen — zusammengesetzt aus Buttons und Tailwind,
 * entsprechend der Content-Skizze (●●●○ ×).
 */
@Component({
  selector: 'ivs-bewertungs-punkte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-1.5" role="group" aria-label="Punktewertung 0 bis 4">
      @for (p of stufen; track p) {
        <button
          type="button"
          class="size-4 rounded-full border border-primary transition-colors disabled:cursor-default"
          [class.bg-primary]="(wert() ?? 0) >= p"
          [class.hover:bg-primary/40]="!nurLesen() && (wert() ?? 0) < p"
          [disabled]="nurLesen()"
          (click)="setze(p)"
          [attr.aria-label]="p + ' von 4 Punkten'"
          [attr.aria-pressed]="(wert() ?? 0) >= p"
        ></button>
      }
      @if (!nurLesen() && wert() !== null) {
        <button
          type="button"
          class="ml-0.5 text-sm leading-none text-muted-foreground hover:text-foreground"
          (click)="setze(null)"
          aria-label="Wertung löschen"
        >
          ×
        </button>
      }
      @if (nurLesen() && wert() === null) {
        <span class="text-sm text-muted-foreground">—</span>
      }
    </div>
  `,
})
export class BewertungsPunkte {
  protected readonly stufen = [1, 2, 3, 4];

  readonly wert = input.required<number | null>();
  readonly nurLesen = input(false);
  readonly wertChange = output<number | null>();

  protected setze(neu: number | null): void {
    if (this.nurLesen()) return;
    // nochmaliger Klick auf den aktuellen Wert setzt eine Stufe tiefer zurück
    const aktuell = this.wert();
    this.wertChange.emit(neu !== null && aktuell === neu ? neu - 1 : neu);
  }
}
