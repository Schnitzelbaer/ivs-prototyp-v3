import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ObjektTyp } from '../core/model';
import { OBJEKT_TYP_SYMBOL, symbolFarbe } from './karten-layer';

/**
 * Legenden-Symbol eines Objekttyps — dieselbe Form und Farbe wie auf der
 * Karte (OBJEKT_TYP_SYMBOL). Verwendet im Hierarchie-Dropdown, im MapTip,
 * im Kartenbild-Panel und in den Objektlisten.
 */
@Component({
  selector: 'ivs-typ-symbol',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex w-4 shrink-0 items-center justify-center' },
  template: `
    @if (symbol().form === 'punkt') {
      <span
        class="rounded-full"
        [style.width.px]="symbol().dicke"
        [style.height.px]="symbol().dicke"
        [style.background]="farbe()"
      ></span>
    } @else {
      <span
        class="w-full rounded-full"
        [style.height.px]="symbol().dicke"
        [style.background]="farbe()"
      ></span>
    }
  `,
})
export class TypSymbol {
  readonly typ = input.required<ObjektTyp>();
  protected readonly symbol = computed(() => OBJEKT_TYP_SYMBOL[this.typ()]);
  protected readonly farbe = computed(() => symbolFarbe(this.symbol().farbe));
}
