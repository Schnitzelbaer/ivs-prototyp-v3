import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { toast } from '@spartan-ng/brain/sonner';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideCalendarPlus,
  lucideMapPin,
  lucideMapPinPlus,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import {
  Begehung,
  BegehungsStore,
  BegehungsZiel,
  VERKEHRSMITTEL_LABEL,
  darfBegehungAnfordern,
  darfBegehungPlanen,
} from '../core/begehungen';
import { EinstellungenStore } from '../core/einstellungen-store';
import { HerkunftStore } from '../core/herkunft-store';
import { HinweisStore } from '../core/hinweis-store';
import { jetztLokal } from '../core/kommentare';
import { NAME_FUER_ROLLE } from '../core/seed-data';
import { ObjektStore } from '../core/objekt-store';
import { ObjektGeo } from '../karte/objekt-geo';
import { Karte } from '../karte/karte';
import { BegehungDialog } from './begehung-dialog';

/** Ein aufbereiteter Kartenpunkt der Begehungs-Route. */
interface RoutenPunkt {
  lon: number;
  lat: number;
  nummer: number;
  titel: string;
}

/**
 * Begehungen (eigener Tab, Entscheid 89): Links die Anforderungen und die
 * geplanten Begehungen, rechts die Karte, auf der die gewählte Begehung
 * als nummerierte Route nachvollziehbar ist. Anfordern dürfen alle
 * fachlichen Rollen (Objekt oder freier Kartenpunkt, mit Begründung);
 * fix planen, umstellen und löschen nur die Fachliche Administration.
 */
@Component({
  selector: 'ivs-begehungen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmTextareaImports,
    HlmTooltipImports,
    BegehungDialog,
    Karte,
  ],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideCalendarPlus,
      lucideMapPin,
      lucideMapPinPlus,
      lucideTrash2,
    }),
  ],
  templateUrl: './begehungen.html',
})
export class Begehungen {
  protected readonly begehungsStore = inject(BegehungsStore);
  private readonly store = inject(ObjektStore);
  private readonly einstellungen = inject(EinstellungenStore);
  private readonly hinweis = inject(HinweisStore);
  private readonly herkunft = inject(HerkunftStore);
  private readonly router = inject(Router);
  private readonly objektGeo = inject(ObjektGeo);

  private readonly karte = viewChild(Karte);

  protected readonly verkehrsmittelLabel = VERKEHRSMITTEL_LABEL;
  protected readonly begehungOffen = signal(false);

  /** Die auf der Karte gezeigte Begehung (erste als Standard). */
  protected readonly aktiveBegehungId = signal<string | null>(null);

  protected readonly aktiveBegehung = computed<Begehung | null>(() => {
    const alle = this.begehungsStore.alle();
    const id = this.aktiveBegehungId();
    return alle.find((b) => b.id === id) ?? alle[0] ?? null;
  });

  /** Aufbereitete Routen-Punkte der aktiven Begehung (asynchron via Bbox). */
  protected readonly routenPunkte = signal<RoutenPunkt[]>([]);

  /** Strecken der aktiven Begehung — filtert die Objekt-Layer der Karte. */
  protected readonly kartenStrecken = computed<string[] | null>(
    () => {
      const begehung = this.aktiveBegehung();
      if (!begehung) return null;
      const strecken = new Set<string>();
      for (const ziel of begehung.ziele) {
        if (ziel.signatur) {
          const objekt = this.store.bySignatur(ziel.signatur);
          if (objekt) strecken.add(this.store.strecke(objekt).signatur);
        }
      }
      return strecken.size ? [...strecken].sort() : null;
    },
    { equal: (a, b) => a === b || (!!a && !!b && a.length === b.length && a.every((s, i) => s === b[i])) },
  );

  protected readonly offeneAnforderungen = computed(() =>
    this.begehungsStore.anforderungen().filter((a) => a.begehungId === null),
  );

  constructor() {
    // Routen-Punkte der aktiven Begehung aufbereiten (Objekt → Bbox-Zentrum)
    effect(() => {
      const begehung = this.aktiveBegehung();
      untracked(() => void this.punkteAufbereiten(begehung));
    });
  }

  private async punkteAufbereiten(begehung: Begehung | null): Promise<void> {
    if (!begehung) {
      this.routenPunkte.set([]);
      return;
    }
    const punkte: RoutenPunkt[] = [];
    for (const [index, ziel] of begehung.ziele.entries()) {
      if (ziel.position) {
        punkte.push({ ...ziel.position, nummer: index + 1, titel: this.zielName(ziel) });
        continue;
      }
      if (!ziel.signatur) continue;
      const objekt = this.store.bySignatur(ziel.signatur);
      if (!objekt) continue;
      const bbox = await this.objektGeo.bbox(objekt.ebene, objekt.signatur);
      if (!bbox) continue;
      punkte.push({
        lon: (bbox[0] + bbox[2]) / 2,
        lat: (bbox[1] + bbox[3]) / 2,
        nummer: index + 1,
        titel: this.zielName(ziel),
      });
    }
    this.routenPunkte.set(punkte);
  }

  // ------------------------------------------------------------ Rechte

  private darfPlanen(): boolean {
    if (darfBegehungPlanen(this.einstellungen.aktiveRolleId())) return true;
    this.hinweis.zeige(
      'Begehungsplanung nicht möglich',
      `Begehungen fix planen, umstellen und löschen kann nur die Fachliche Administration ` +
        `(R-03) — nicht die Rolle «${this.einstellungen.aktiveRolle().name}». ` +
        'Über «Begehung anfordern» lässt sich der Bedarf melden.',
    );
    return false;
  }

  private darfAnfordern(): boolean {
    if (darfBegehungAnfordern(this.einstellungen.aktiveRolleId())) return true;
    this.hinweis.zeige(
      'Anfordern nicht möglich',
      'Begehungen anfordern können die fachlichen Rollen R-03 bis R-07.',
    );
    return false;
  }

  protected begehungPlanen(): void {
    if (this.darfPlanen()) this.begehungOffen.set(true);
  }

  protected loeschen(id: string): void {
    if (!this.darfPlanen()) return;
    this.begehungsStore.loeschen(id);
    toast.success('Begehung gelöscht', {
      description: 'Eingeplante Anforderungen sind wieder offen.',
    });
  }

  protected verschieben(id: string, index: number, richtung: -1 | 1): void {
    if (this.darfPlanen()) this.begehungsStore.verschieben(id, index, richtung);
  }

  // ----------------------------------------------------- Anforderungen

  protected readonly anfordernOffen = signal(false);
  protected readonly anfordernSignatur = signal('');
  protected readonly anfordernBezeichnung = signal('');
  protected readonly anfordernBegruendung = signal('');
  protected readonly anfordernPosition = signal<{ lon: number; lat: number } | null>(null);
  /** Punktwahl-Modus: nächster Kartenklick liefert die Position. */
  protected readonly punktwahlAktiv = signal(false);

  protected readonly alleObjekte = computed(() =>
    [...this.store.alle()].sort((a, b) =>
      a.signatur.localeCompare(b.signatur, 'de-CH', { numeric: true }),
    ),
  );

  protected begehungAnfordern(): void {
    if (!this.darfAnfordern()) return;
    this.anfordernSignatur.set('');
    this.anfordernBezeichnung.set('');
    this.anfordernBegruendung.set('');
    this.anfordernPosition.set(null);
    this.anfordernOffen.set(true);
  }

  /** Punkt auf der Karte wählen: Dialog kurz schliessen, Klick abwarten. */
  protected punktWaehlen(): void {
    this.anfordernOffen.set(false);
    this.punktwahlAktiv.set(true);
    this.karte()?.kommentarWerkzeugUmschalten();
  }

  /** Kartenklick während der Punktwahl (liefert Position und Treffer). */
  protected positionGewaehlt(position: { lon: number; lat: number; signatur: string | null }): void {
    if (!this.punktwahlAktiv()) return;
    this.punktwahlAktiv.set(false);
    this.anfordernPosition.set({ lon: position.lon, lat: position.lat });
    // Ein getroffenes Objekt übernehmen wir als Vorschlag, falls noch keines gewählt ist
    if (position.signatur && !this.anfordernSignatur()) {
      this.anfordernSignatur.set(position.signatur);
    }
    this.anfordernOffen.set(true);
  }

  protected anforderungSpeichern(): void {
    const begruendung = this.anfordernBegruendung().trim();
    const signatur = this.anfordernSignatur() || null;
    const position = this.anfordernPosition();
    if (!begruendung || (!signatur && !position)) return;
    const rolle = this.einstellungen.aktiveRolleId();
    this.begehungsStore.anfordern({
      signatur,
      position: signatur ? null : position,
      bezeichnung: this.anfordernBezeichnung().trim(),
      begruendung,
      autor: NAME_FUER_ROLLE[rolle],
      rolle,
      datum: jetztLokal().slice(0, 10),
    });
    this.anfordernOffen.set(false);
    toast.success('Begehung angefordert', {
      description: 'Die Fachliche Administration plant sie bei der nächsten Gelegenheit ein.',
    });
  }

  protected anforderungLoeschen(id: string): void {
    const anforderung = this.begehungsStore.anforderungen().find((a) => a.id === id);
    if (!anforderung) return;
    const rolle = this.einstellungen.aktiveRolleId();
    // Löschen darf die Fachliche Administration oder wer angefordert hat
    if (rolle !== 'R-03' && NAME_FUER_ROLLE[rolle] !== anforderung.autor) {
      this.hinweis.zeige(
        'Löschen nicht möglich',
        'Eine Anforderung löschen kann nur die Fachliche Administration (R-03) oder die ' +
          'Person, die sie erfasst hat.',
      );
      return;
    }
    this.begehungsStore.anforderungLoeschen(id);
  }

  // ------------------------------------------------------------- Helfer

  protected zielName(ziel: BegehungsZiel): string {
    if (!ziel.signatur) return ziel.bezeichnung || 'Kartenpunkt';
    const objekt = this.store.bySignatur(ziel.signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : ziel.signatur;
  }

  protected anforderungsZiel(a: { signatur: string | null; bezeichnung: string }): string {
    if (!a.signatur) return `Kartenpunkt: ${a.bezeichnung || 'ohne Bezeichnung'}`;
    const objekt = this.store.bySignatur(a.signatur);
    return objekt ? `${objekt.signatur} – ${objekt.name}` : a.signatur;
  }

  protected oeffneZiel(ziel: BegehungsZiel): void {
    if (!ziel.signatur) return;
    const objekt = this.store.bySignatur(ziel.signatur);
    if (!objekt) return;
    this.herkunft.uebersicht.set('/dashboard');
    void this.router.navigate(['/objekt', objekt.id]);
  }

  protected formatDatum(iso: string): string {
    const [j, m, t] = iso.split('-');
    return `${t}.${m}.${j}`;
  }
}
