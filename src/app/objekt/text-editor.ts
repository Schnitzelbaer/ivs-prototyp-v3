import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBold, lucideEraser, lucideHighlighter, lucideItalic, lucideStrikethrough } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Markerfarben zum Einfärben von Textstellen (Todos, Diskussionsbedarf …). */
const MARKER_FARBEN = [
  { id: 'gelb', farbe: '#fde047', label: 'Gelb markieren' },
  { id: 'gruen', farbe: '#86efac', label: 'Grün markieren' },
  { id: 'rot', farbe: '#fca5a5', label: 'Rot markieren' },
] as const;

/**
 * Einfacher Rich-Text-Editor für die Objektbeschriebe (07.17): fett, kursiv,
 * durchstreichen und farbiges Markieren, um eigene Todos zu kennzeichnen
 * oder Textstellen zur Diskussion zu markieren. contenteditable-basiert;
 * der Wert ist HTML und wird im Lesemodus als solches dargestellt.
 */
@Component({
  selector: 'ivs-text-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmButtonImports, HlmTooltipImports],
  providers: [
    provideIcons({ lucideBold, lucideEraser, lucideHighlighter, lucideItalic, lucideStrikethrough }),
  ],
  template: `
    <div class="rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div class="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-7"
          type="button"
          (mousedown)="$event.preventDefault()"
          (click)="befehl('bold')"
          hlmTooltip="Fett"
          aria-label="Fett"
        >
          <ng-icon name="lucideBold" />
        </button>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-7"
          type="button"
          (mousedown)="$event.preventDefault()"
          (click)="befehl('italic')"
          hlmTooltip="Kursiv"
          aria-label="Kursiv"
        >
          <ng-icon name="lucideItalic" />
        </button>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-7"
          type="button"
          (mousedown)="$event.preventDefault()"
          (click)="befehl('strikeThrough')"
          hlmTooltip="Durchstreichen"
          aria-label="Durchstreichen"
        >
          <ng-icon name="lucideStrikethrough" />
        </button>
        <div class="mx-1 h-4 w-px bg-border"></div>
        @for (marker of markerFarben; track marker.id) {
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md hover:bg-accent"
            (mousedown)="$event.preventDefault()"
            (click)="markieren(marker.farbe)"
            [hlmTooltip]="marker.label"
            [attr.aria-label]="marker.label"
          >
            <span class="size-3.5 rounded-full border border-black/20" [style.background]="marker.farbe"></span>
          </button>
        }
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-7"
          type="button"
          (mousedown)="$event.preventDefault()"
          (click)="formatEntfernen()"
          hlmTooltip="Formatierung entfernen"
          aria-label="Formatierung entfernen"
        >
          <ng-icon name="lucideEraser" />
        </button>
        @if (zeichenLimit(); as limit) {
          <span class="ml-auto pr-1 text-xs tabular-nums" [class.text-destructive]="zeichen() > limit" [class.text-muted-foreground]="zeichen() <= limit">
            {{ zeichen() }}/{{ limit }}
          </span>
        }
      </div>
      <div
        #feld
        contenteditable="true"
        class="min-h-24 px-2.5 py-2 text-sm outline-none [&_s]:decoration-destructive/70"
        [style.min-height.px]="minHoehe()"
        (input)="eingabe()"
        (blur)="eingabe()"
        role="textbox"
        aria-multiline="true"
      ></div>
    </div>
  `,
})
export class TextEditor implements AfterViewInit {
  private readonly feld = viewChild.required<ElementRef<HTMLDivElement>>('feld');

  /** HTML-Wert (Zwei-Weg-Bindung). */
  readonly wert = model('');
  readonly minHoehe = input(96);
  readonly zeichenLimit = input<number | null>(null);

  protected readonly markerFarben = MARKER_FARBEN;
  protected readonly zeichen = signal(0);

  private zuletztGesendet = '';

  constructor() {
    // Wert von aussen übernehmen (z. B. Objektwechsel) — nicht bei jedem
    // eigenen Tastendruck den DOM neu setzen (Cursor bliebe sonst nicht stehen)
    effect(() => {
      const wert = this.wert();
      untracked(() => {
        const element = this.feld().nativeElement;
        if (wert !== this.zuletztGesendet && element.innerHTML !== wert) {
          element.innerHTML = wert;
          this.zeichen.set(element.textContent?.length ?? 0);
        }
        this.zuletztGesendet = wert;
      });
    });
  }

  ngAfterViewInit(): void {
    const element = this.feld().nativeElement;
    element.innerHTML = this.wert();
    this.zeichen.set(element.textContent?.length ?? 0);
    this.zuletztGesendet = this.wert();
  }

  protected eingabe(): void {
    const element = this.feld().nativeElement;
    this.zeichen.set(element.textContent?.length ?? 0);
    this.zuletztGesendet = element.innerHTML;
    this.wert.set(element.innerHTML);
  }

  protected befehl(name: string): void {
    this.feld().nativeElement.focus();
    document.execCommand(name);
    this.eingabe();
  }

  protected markieren(farbe: string): void {
    this.feld().nativeElement.focus();
    document.execCommand('hiliteColor', false, farbe);
    this.eingabe();
  }

  protected formatEntfernen(): void {
    this.feld().nativeElement.focus();
    document.execCommand('removeFormat');
    document.execCommand('hiliteColor', false, 'transparent');
    this.eingabe();
  }
}
