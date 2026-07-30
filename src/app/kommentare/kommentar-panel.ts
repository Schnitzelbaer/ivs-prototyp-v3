import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideAtSign,
  lucideCheck,
  lucideChevronDown,
  lucideEllipsis,
  lucideHash,
  lucideListFilter,
  lucideSearch,
  lucideSend,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { OBJEKT_ATTRIBUTE, attributVonLabel } from '../core/attribute';
import { EinstellungenStore } from '../core/einstellungen-store';
import { Kommentar, KommentarSegment, KommentarStore, jetztLokal, parseKommentarText } from '../core/kommentare';
import { ROLLEN } from '../core/rollen';
import { NAME_FUER_ROLLE } from '../core/seed-data';

type KommentarFilter = 'alle' | 'offen' | 'erledigt' | 'meine';

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * Kommentar-Panel (09/10) nach Skizze: Suche, Sortierung, Filter, Threads
 * mit Antworten, Erledigt-Kennzeichnung, Erwähnungen (`@[Name]`) und
 * Attribut-Referenzen (`#[Label]`) — Letztere scrollen im Objektformular
 * zum Feld (Output `attributKlick`).
 */
@Component({
  selector: 'ivs-kommentar-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmInputImports,
    HlmInputGroupImports,
    HlmTextareaImports,
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideAtSign,
      lucideCheck,
      lucideChevronDown,
      lucideEllipsis,
      lucideHash,
      lucideListFilter,
      lucideSearch,
      lucideSend,
    }),
  ],
  templateUrl: './kommentar-panel.html',
})
export class KommentarPanel {
  private readonly store = inject(KommentarStore);
  protected readonly einstellungen = inject(EinstellungenStore);

  private readonly textfeld = viewChild<ElementRef<HTMLTextAreaElement>>('textfeld');

  /** Signatur des Objekts; null = übergreifende Ansicht (alle Kommentare). */
  readonly objektSignatur = input<string | null>(null);
  /**
   * Id eines zusätzlich anzuzeigenden Kommentars — beim Klick auf einen
   * Karten-Pin eines anderen (oder keines) Objekts wäre die objektgebundene
   * Liste sonst leer und der Klick wirkte kaputt.
   */
  readonly zusatzKommentarId = input<string | null>(null);

  readonly attributKlick = output<string>();
  readonly objektKlick = output<string>();

  protected readonly attribute = OBJEKT_ATTRIBUTE;
  protected readonly benutzer = ROLLEN.filter((r) => r.waehlbar).map((r) => ({
    name: NAME_FUER_ROLLE[r.id],
    rolle: r.id,
    rollenName: r.name,
  }));

  protected readonly suche = signal('');
  protected readonly filter = signal<KommentarFilter>('alle');
  protected readonly neuesteZuerst = signal(true);
  protected readonly offeneAntworten = signal<ReadonlySet<string>>(new Set());
  protected readonly antwortEntwuerfe = signal<Readonly<Record<string, string>>>({});

  protected readonly neuerTitel = signal('');
  protected readonly neuerText = signal('');

  protected readonly persona = computed(() => {
    const rolle = this.einstellungen.aktiveRolleId();
    return { name: NAME_FUER_ROLLE[rolle], rolle, rollenName: this.einstellungen.aktiveRolle().name };
  });

  protected readonly kommentare = computed(() => {
    const signatur = this.objektSignatur();
    const begriff = this.suche().trim().toLowerCase();
    const filter = this.filter();
    const ich = this.persona().name;
    const richtung = this.neuesteZuerst() ? -1 : 1;

    const zusatz = this.zusatzKommentarId();
    return this.store
      .alle()
      .filter((k) => {
        if (signatur !== null && k.objektSignatur !== signatur && k.id !== zusatz) return false;
        if (filter === 'offen' && k.erledigt) return false;
        if (filter === 'erledigt' && !k.erledigt) return false;
        if (filter === 'meine' && k.autor !== ich) return false;
        if (begriff) {
          const text = `${k.titel} ${k.text} ${k.autor} ${k.antworten.map((a) => a.text).join(' ')}`.toLowerCase();
          if (!text.includes(begriff)) return false;
        }
        return true;
      })
      .sort((a, b) => richtung * a.zeit.localeCompare(b.zeit));
  });

  protected readonly gesamt = computed(() => {
    const signatur = this.objektSignatur();
    return signatur === null ? this.store.alle().length : this.store.fuerObjekt(signatur).length;
  });

  protected segmente(text: string): KommentarSegment[] {
    return parseKommentarText(text);
  }

  protected attributAnker(label: string): void {
    const attribut = attributVonLabel(label);
    if (attribut) this.attributKlick.emit(attribut.anker);
  }

  protected antwortenUmschalten(id: string): void {
    this.offeneAntworten.update((menge) => {
      const neu = new Set(menge);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  protected erledigtUmschalten(kommentar: Kommentar): void {
    this.store.erledigtSetzen(kommentar.id, !kommentar.erledigt);
  }

  protected loeschen(kommentar: Kommentar): void {
    this.store.loeschen(kommentar.id);
  }

  protected istEigener(kommentar: Kommentar): boolean {
    return kommentar.autor === this.persona().name;
  }

  protected antwortEntwurf(id: string): string {
    return this.antwortEntwuerfe()[id] ?? '';
  }

  protected setzeAntwortEntwurf(id: string, text: string): void {
    this.antwortEntwuerfe.update((e) => ({ ...e, [id]: text }));
  }

  protected antwortSenden(kommentar: Kommentar): void {
    const text = this.antwortEntwurf(kommentar.id).trim();
    if (!text) return;
    const { name, rolle } = this.persona();
    this.store.antworten(kommentar.id, { autor: name, rolle, zeit: jetztLokal(), text });
    this.setzeAntwortEntwurf(kommentar.id, '');
    this.offeneAntworten.update((menge) => new Set(menge).add(kommentar.id));
  }

  protected kommentarSenden(): void {
    const text = this.neuerText().trim();
    if (!text) return;
    const { name, rolle } = this.persona();
    this.store.hinzufuegen({
      objektSignatur: this.objektSignatur(),
      position: null,
      titel: this.neuerTitel().trim(),
      text,
      autor: name,
      rolle,
      zeit: jetztLokal(),
      erledigt: false,
      antworten: [],
    });
    this.neuerTitel.set('');
    this.neuerText.set('');
  }

  /** Fügt ein `@[…]`- oder `#[…]`-Token an der Cursorposition ein. */
  protected tokenEinfuegen(token: string): void {
    const feld = this.textfeld()?.nativeElement;
    const aktuell = this.neuerText();
    if (!feld) {
      this.neuerText.set(`${aktuell}${token} `);
      return;
    }
    const start = feld.selectionStart ?? aktuell.length;
    const ende = feld.selectionEnd ?? aktuell.length;
    this.neuerText.set(`${aktuell.slice(0, start)}${token} ${aktuell.slice(ende)}`);
    setTimeout(() => {
      feld.focus();
      const position = start + token.length + 1;
      feld.setSelectionRange(position, position);
    });
  }

  protected formatZeit(iso: string): string {
    const datum = new Date(iso);
    if (Number.isNaN(datum.getTime())) return iso;
    const tag = String(datum.getDate()).padStart(2, '0');
    const monat = String(datum.getMonth() + 1).padStart(2, '0');
    const stunden = String(datum.getHours()).padStart(2, '0');
    const minuten = String(datum.getMinutes()).padStart(2, '0');
    return `${WOCHENTAGE[datum.getDay()]} ${tag}.${monat}.${datum.getFullYear()} ${stunden}:${minuten}`;
  }
}
