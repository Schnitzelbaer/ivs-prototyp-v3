import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCarouselImports } from '@spartan-ng/helm/carousel';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmResizableImports } from '@spartan-ng/helm/resizable';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { NgScrollbar } from 'ngx-scrollbar';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-layout-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoBlock,
    HlmAccordionImports,
    HlmButtonImports,
    HlmCarouselImports,
    HlmCollapsibleImports,
    HlmResizableImports,
    HlmScrollAreaImports,
    NgScrollbar,
  ],
  template: `
    <ks-block title="Accordion" anchor="accordion" note="Kapitel eines Objektbeschriebs, einzeln aufklappbar">
      <hlm-accordion class="max-w-xl">
        @for (item of kapitel; track item.titel) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{ item.titel }}</hlm-accordion-trigger>
            <hlm-accordion-content>{{ item.text }}</hlm-accordion-content>
          </hlm-accordion-item>
        }
      </hlm-accordion>
    </ks-block>

    <ks-block title="Collapsible" anchor="collapsible" note="Einzelner ausklappbarer Bereich">
      <div hlmCollapsible class="max-w-xl space-y-2">
        <button hlmCollapsibleTrigger hlmBtn variant="outline" size="sm">
          Nachträge anzeigen
        </button>
        <div hlmCollapsibleContent class="text-muted-foreground space-y-2 text-sm">
          <p>Ergänzung der Fassung von 1992/94 von Roland Flückiger (Klaus Aerni, 10. 1. 2003).</p>
          <p>Nummerierte Punkte auf Streckenebene mit eigenem Bearbeitungsvermerk.</p>
        </div>
      </div>
    </ks-block>

    <ks-block title="Carousel" anchor="carousel" note="Bildstrecke eines Objekts">
      <div class="mx-auto max-w-sm">
        <hlm-carousel>
          <hlm-carousel-content>
            @for (bild of bilder; track bild) {
              <hlm-carousel-item>
                <div class="p-1">
                  <div
                    class="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-lg text-sm"
                  >
                    {{ bild }}
                  </div>
                </div>
              </hlm-carousel-item>
            }
          </hlm-carousel-content>
          <button hlm-carousel-previous></button>
          <button hlm-carousel-next></button>
        </hlm-carousel>
      </div>
    </ks-block>

    <ks-block title="Resizable" anchor="resizable" note="Karte und Beschrieb nebeneinander, Breite verstellbar">
      <hlm-resizable-group class="h-56 max-w-2xl rounded-lg border">
        <hlm-resizable-panel>
          <div class="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
            Karte
          </div>
        </hlm-resizable-panel>
        <hlm-resizable-handle />
        <hlm-resizable-panel>
          <hlm-resizable-group direction="vertical">
            <hlm-resizable-panel>
              <div class="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
                Objektbeschrieb
              </div>
            </hlm-resizable-panel>
            <hlm-resizable-handle />
            <hlm-resizable-panel>
              <div class="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
                Prüfregister
              </div>
            </hlm-resizable-panel>
          </hlm-resizable-group>
        </hlm-resizable-panel>
      </hlm-resizable-group>
    </ks-block>

    <ks-block title="Scroll Area" anchor="scroll-area" note="Eigener Scrollbereich mit gestylter Leiste">
      <ng-scrollbar hlm class="h-48 max-w-sm rounded-lg border">
        <div class="space-y-2 p-4 text-sm">
          @for (eintrag of historie; track eintrag) {
            <p class="border-b pb-2 last:border-0">{{ eintrag }}</p>
          }
        </div>
      </ng-scrollbar>
    </ks-block>
  `,
})
export class LayoutSection {
  protected readonly kapitel = [
    {
      titel: 'Geschichte',
      text: 'Chronologisch gegliederter Fliesstext von der Ur- und Frühgeschichte bis in die Neuzeit, mit Literaturzitaten und Querverweisen auf benachbarte Objekte.',
    },
    {
      titel: 'Gelände',
      text: 'Beschreibung der erhaltenen Wegsubstanz: Hangweg, Stützmauern, Pflästerung, Querabschläge, Trockenmauern mit Breitenangaben in Metern.',
    },
    {
      titel: 'Nachträge',
      text: 'Ergänzungen zur ursprünglichen Fassung mit eigenem Bearbeitungsvermerk und nummerierten Punkten.',
    },
  ];

  protected readonly bilder = ['Abb. 1 — Pflästerung', 'Abb. 2 — Stützmauer', 'Abb. 3 — Querabschlag'];

  protected readonly historie = [
    '28.07.2026 — R. Flückiger — Geometrie mutiert',
    '24.07.2026 — K. Aerni — Kommentar erledigt',
    '19.07.2026 — R. Flückiger — Text «Gelände» geändert',
    '12.07.2026 — M. Bieri — Status auf «In Prüfung»',
    '08.07.2026 — R. Flückiger — Bild hinzugefügt',
    '01.07.2026 — System — Objekt zugewiesen',
    '28.06.2026 — K. Aerni — Bedeutung auf «national»',
    '20.06.2026 — R. Flückiger — Objekt erstellt',
  ];
}
