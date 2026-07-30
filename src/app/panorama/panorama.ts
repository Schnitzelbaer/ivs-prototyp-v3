import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideRoute } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ObjektStore } from '../core/objekt-store';
import { Karte } from '../karte/karte';
import { erzeugePanorama } from './panorama-bilder';
import { PanoramaViewer } from './panorama-viewer';

interface Aufnahme {
  titel: string;
  datum: string;
  lon: number;
  lat: number;
  /** Wegrichtung «vorwärts» (Richtung nächste Aufnahme), Grad ab Nord. */
  wegAzimut: number;
  /** Signatur des nächstgelegenen IVS-Objekts. */
  objektSignatur: string;
  bild: string;
}

/**
 * 360°-Aufnahmen (06, Vorgabe 9): drehbares Panorama mit Vor-/Zurück-
 * Navigation entlang der Aufnahmefahrt und Karte mit Standort und live
 * mitdrehender Blickrichtung. Die Aufnahmen sind Platzhalter; die Standorte
 * liegen real auf der alten Murtenstrasse zwischen Riedbach und Bümpliz
 * (Route 916 der Testdaten).
 */
@Component({
  selector: 'ivs-panorama',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmBadgeImports, HlmButtonImports, HlmTooltipImports, Karte, PanoramaViewer],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideRoute })],
  templateUrl: './panorama.html',
})
export class Panorama {
  private readonly store = inject(ObjektStore);
  private readonly router = inject(Router);

  /**
   * Standorte aus Route 916 (West → Ost), Azimute entlang des Wegs.
   * Benannt nach Stationierung ab Riedbach, wie bei echten Befahrungsdaten.
   */
  protected readonly aufnahmen: Aufnahme[] = [
    { titel: 'Station 0.32 km', datum: '2025-06-17', lon: 7.334735, lat: 46.955129, wegAzimut: 68, objektSignatur: 'BE 7.2.4', bild: erzeugePanorama({ wegAzimut: 68, seed: 1 }) },
    { titel: 'Station 0.96 km', datum: '2025-06-17', lon: 7.340895, lat: 46.953763, wegAzimut: 108, objektSignatur: 'BE 7.2.3', bild: erzeugePanorama({ wegAzimut: 108, seed: 2 }) },
    { titel: 'Station 1.60 km', datum: '2025-06-17', lon: 7.350004, lat: 46.952241, wegAzimut: 105, objektSignatur: 'BE 7.2.2', bild: erzeugePanorama({ wegAzimut: 105, seed: 3 }) },
    { titel: 'Station 2.24 km', datum: '2025-06-17', lon: 7.35748, lat: 46.949441, wegAzimut: 118, objektSignatur: 'BE 7.2.2', bild: erzeugePanorama({ wegAzimut: 118, seed: 4 }) },
    { titel: 'Station 2.87 km', datum: '2025-06-17', lon: 7.365208, lat: 46.94777, wegAzimut: 95, objektSignatur: 'BE 7.2.1', bild: erzeugePanorama({ wegAzimut: 95, seed: 5 }) },
  ];

  protected readonly index = signal(0);
  protected readonly azimut = signal(this.aufnahmen[0].wegAzimut);

  protected readonly aufnahme = computed(() => this.aufnahmen[this.index()]);
  protected readonly standort = computed(() => {
    const { lon, lat } = this.aufnahme();
    return { lon, lat };
  });
  protected readonly objekt = computed(() => this.store.bySignatur(this.aufnahme().objektSignatur));

  protected wechsle(schritt: 1 | -1): void {
    const neu = this.index() + schritt;
    if (neu < 0 || neu >= this.aufnahmen.length) return;
    this.index.set(neu);
    // Blick in Fahrtrichtung: vorwärts entlang des Wegs, rückwärts entgegen
    const weg = this.aufnahmen[neu].wegAzimut;
    this.azimut.set(schritt === 1 ? weg : (weg + 180) % 360);
  }

  protected oeffneObjekt(signatur: string): void {
    const objekt = this.store.bySignatur(signatur);
    if (objekt) void this.router.navigate(['/objekt', objekt.id]);
  }

  protected formatDatum(iso: string): string {
    const [j, m, t] = iso.split('-');
    return `${t}.${m}.${j}`;
  }
}
