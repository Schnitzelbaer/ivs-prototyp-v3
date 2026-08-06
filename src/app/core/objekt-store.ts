import { Injectable, computed, effect, signal } from '@angular/core';
import { jetztLokal } from './kommentare';
import { IvsObjekt, Lognotiz, RolleId, WorkflowStatus, idAusSignatur } from './model';
import { ladeObjektModell } from './objekt-generierung';
import { KANTONE } from './paket-store';
import {
  SEED_OBJEKTE,
  SEED_VERSION,
  objektAusVorlage,
  statusVonStreckeErben,
  zustaendigkeitFuerStatus,
} from './seed-data';
import { STATUS_LABEL } from './status';

interface Ablage {
  version: number;
  objekte: IvsObjekt[];
}

const STORAGE_KEY = 'ivs-prototyp-v3.objekte';

/**
 * Hält alle IVS-Objekte als Signal und spiegelt jede Änderung in den
 * localStorage. Passt die gespeicherte Seed-Version nicht mehr, wird der
 * Stand verworfen und neu geseedet (SEED_VERSION in seed-data.ts erhöhen).
 */
@Injectable({ providedIn: 'root' })
export class ObjektStore {
  private readonly objekte = signal<IvsObjekt[]>(laden());

  readonly alle = this.objekte.asReadonly();

  readonly strecken = computed(() => this.objekte().filter((o) => o.ebene === 'strecke'));

  constructor() {
    effect(() => {
      const ablage: Ablage = { version: SEED_VERSION, objekte: this.objekte() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ablage));
      } catch {
        // Speicher voll oder blockiert — der Prototyp läuft dann ohne Persistenz weiter.
      }
    });
    // Vollabdeckung: generierte Objekte ergänzen den kuratierten Seed. Nach
    // dem Laden aus dem localStorage sind sie bereits enthalten — der Filter
    // auf vorhandene Ids macht den Aufruf idempotent.
    void this.generierteErgaenzen();
  }

  /** Generierte Objekte (Vollabdeckung der Testdaten) nachladen. */
  private async generierteErgaenzen(): Promise<void> {
    const { generierte } = await ladeObjektModell();
    this.objekte.update((liste) => {
      const vorhanden = new Set(liste.map((o) => o.id));
      const neue = generierte.filter((o) => !vorhanden.has(o.id));
      if (!neue.length) return liste;
      // Generierte Nachkommen kuratierter Strecken erben deren Status
      // und Zuständigkeit (Entscheid 78)
      return statusVonStreckeErben([...liste, ...neue.map((o) => strukturKopie(o))]);
    });
  }

  byId(id: string): IvsObjekt | undefined {
    return this.objekte().find((o) => o.id === id);
  }

  bySignatur(signatur: string): IvsObjekt | undefined {
    return this.objekte().find((o) => o.signatur === signatur);
  }

  kinder(signatur: string): IvsObjekt[] {
    return this.objekte().filter((o) => o.parent === signatur);
  }

  /** Wurzel-Strecke eines Objekts (für die Hierarchie-Anzeige). */
  strecke(objekt: IvsObjekt): IvsObjekt {
    let aktuell = objekt;
    while (aktuell.parent) {
      const parent = this.bySignatur(aktuell.parent);
      if (!parent) break;
      aktuell = parent;
    }
    return aktuell;
  }

  update(id: string, patch: Partial<IvsObjekt>): void {
    this.objekte.update((liste) => liste.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  /**
   * Alle Nachkommen der übergebenen Signaturen (inklusive dieser selbst),
   * über die parent-Verkettung gesammelt.
   */
  private mitNachkommen(signaturen: Iterable<string>): Set<string> {
    const menge = new Set<string>(signaturen);
    let gewachsen = true;
    while (gewachsen) {
      gewachsen = false;
      for (const o of this.objekte()) {
        if (o.parent && menge.has(o.parent) && !menge.has(o.signatur)) {
          menge.add(o.signatur);
          gewachsen = true;
        }
      }
    }
    return menge;
  }

  /**
   * Statuswechsel als fachliche Operation: setzt den Status und
   * protokolliert den Übergang als Lognotiz. Die Zuständigkeit wird als
   * Rollen-Übergabe nachgeführt (08.03): Die Person bleibt, wenn sie der
   * neu zuständigen Rolle bereits angehört — explizite Zuweisungen
   * (Entscheid 81) gehen nicht verloren —, sonst übernimmt die Persona
   * der Rolle und der Wechsel steht mit in der Lognotiz. «Offen»
   * entzieht die Zuweisung (Entscheid 79). Der Status wird auf
   * Strecken-Ebene geführt (Entscheid 78) — bei Strecken erben alle
   * Nachkommen Status und Zuständigkeit still (Lognotiz nur am Objekt
   * selbst). So bleibt die Historisierung unabhängig vom Einstiegspunkt
   * (Dashboard, Detail) vollständig.
   */
  statusWechseln(id: string, status: WorkflowStatus, autor: string, autorRolle: RolleId): void {
    const objekt = this.byId(id);
    if (!objekt || objekt.status === status) return;
    const ziel = zustaendigkeitFuerStatus(status);
    const behalten =
      status !== 'offen' && objekt.zustaendigRolle === ziel.rolle && !!objekt.zustaendigName;
    const zustaendigRolle = behalten ? objekt.zustaendigRolle : ziel.rolle;
    const zustaendigName = behalten ? objekt.zustaendigName : ziel.name;
    const personWechselt = zustaendigName !== objekt.zustaendigName;
    const betroffene =
      objekt.ebene === 'strecke'
        ? this.mitNachkommen([objekt.signatur])
        : new Set([objekt.signatur]);
    const notiz: Lognotiz = {
      datum: jetztLokal().slice(0, 10),
      autor,
      rolle: autorRolle,
      text:
        `Status: ${STATUS_LABEL[objekt.status]} → ${STATUS_LABEL[status]}` +
        (personWechselt ? `, zuständig neu ${zustaendigName || '—'}` : ''),
    };
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!betroffene.has(o.signatur)) return o;
        return {
          ...o,
          status,
          zustaendigRolle,
          zustaendigName,
          lognotizen: o.id === id ? [...o.lognotizen, notiz] : o.lognotizen,
        };
      }),
    );
  }

  /**
   * Zuständigkeit als fachliche Operation (Entscheid 81): Die Person wird
   * wie der Status auf Strecken-Ebene geführt — Nachkommen erben sie
   * still, die Lognotiz steht am Objekt selbst. Der Workflow-Status
   * bleibt unberührt; einzig ein «offenes» Objekt wechselt mit der
   * Zuweisung automatisch auf «Zugewiesen» (Entscheid 79).
   */
  personZuweisen(
    id: string,
    person: { name: string; rolle: RolleId },
    autor: string,
    autorRolle: RolleId,
  ): void {
    const objekt = this.byId(id);
    if (!objekt || objekt.zustaendigName === person.name) return;
    const status: WorkflowStatus = objekt.status === 'offen' ? 'zugewiesen' : objekt.status;
    const betroffene =
      objekt.ebene === 'strecke'
        ? this.mitNachkommen([objekt.signatur])
        : new Set([objekt.signatur]);
    const notiz: Lognotiz = {
      datum: jetztLokal().slice(0, 10),
      autor,
      rolle: autorRolle,
      text: objekt.zustaendigName
        ? `Zugewiesen an ${person.name} (${person.rolle}), vorher ${objekt.zustaendigName}.`
        : `Zugewiesen an ${person.name} (${person.rolle}).`,
    };
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!betroffene.has(o.signatur)) return o;
        return {
          ...o,
          status,
          zustaendigRolle: person.rolle,
          zustaendigName: person.name,
          lognotizen: o.id === id ? [...o.lognotizen, notiz] : o.lognotizen,
        };
      }),
    );
  }

  /**
   * Multi-Edit (04.04): dasselbe Attribut auf mehreren Objekten in einem
   * Zug setzen. Keine Vererbung — die Attribute gehören dem Objekt
   * selbst; Lognotiz je Objekt. Die Rechteprüfung (Rolle × Status)
   * geschieht beim Aufrufer. Gibt die Zahl der geänderten Objekte zurück.
   */
  attributSetzenMehrere(
    ids: readonly string[],
    patchFuer: (o: IvsObjekt) => Partial<IvsObjekt>,
    notizText: string,
    autor: string,
    autorRolle: RolleId,
  ): number {
    const menge = new Set(ids);
    const datum = jetztLokal().slice(0, 10);
    let anzahl = 0;
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!menge.has(o.id)) return o;
        anzahl++;
        return {
          ...o,
          ...patchFuer(o),
          lognotizen: [
            ...o.lognotizen,
            { datum, autor, rolle: autorRolle, text: notizText },
          ],
        };
      }),
    );
    return anzahl;
  }

  lognotizHinzufuegen(id: string, notiz: Lognotiz): void {
    const objekt = this.byId(id);
    if (!objekt) return;
    this.update(id, { lognotizen: [...objekt.lognotizen, notiz] });
  }

  /**
   * Zuständigkeit für mehrere Strecken in einem Zug (Multi-Edit,
   * 04.04): gleiche Semantik wie personZuweisen — Vererbung auf die
   * Nachkommen, Lognotiz je Strecke, «offene» Objekte wechseln mit der
   * Zuweisung auf «Zugewiesen», sonst bleibt der Status unberührt.
   * Gibt die Zahl der tatsächlich gewechselten Strecken zurück.
   */
  personZuweisenMehrere(
    ids: readonly string[],
    person: { name: string; rolle: RolleId },
    autor: string,
    autorRolle: RolleId,
  ): number {
    const menge = new Set(ids);
    const wechselnde = this.objekte().filter(
      (o) => menge.has(o.id) && o.zustaendigName !== person.name,
    );
    if (!wechselnde.length) return 0;
    const notizIds = new Set(wechselnde.map((o) => o.id));
    const signaturen = this.mitNachkommen(wechselnde.map((o) => o.signatur));
    const vorherProId = new Map(wechselnde.map((o) => [o.id, o.zustaendigName]));
    const datum = jetztLokal().slice(0, 10);
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!signaturen.has(o.signatur)) return o;
        const vorher = vorherProId.get(o.id);
        return {
          ...o,
          status: o.status === 'offen' ? ('zugewiesen' as WorkflowStatus) : o.status,
          zustaendigRolle: person.rolle,
          zustaendigName: person.name,
          // Lognotiz nur auf den gewählten Strecken, Nachkommen erben still
          lognotizen: notizIds.has(o.id)
            ? [
                ...o.lognotizen,
                {
                  datum,
                  autor,
                  rolle: autorRolle,
                  text: vorher
                    ? `Zugewiesen an ${person.name} (${person.rolle}), vorher ${vorher}.`
                    : `Zugewiesen an ${person.name} (${person.rolle}).`,
                },
              ]
            : o.lognotizen,
        };
      }),
    );
    return wechselnde.length;
  }

  /**
   * Strecken einem anderen Kanton zuordnen (Entscheid 82): Grenzfälle
   * können vom einen Kantonspaket ins andere wandern. Die Signatur bleibt
   * unverändert — nur das Kanton-Attribut wechselt; Nachkommen ziehen
   * still mit (Lognotiz an der Strecke). Gibt die Zahl der tatsächlich
   * verschobenen Strecken zurück.
   */
  kantonZuordnen(
    ids: readonly string[],
    kanton: string,
    autor: string,
    autorRolle: RolleId,
  ): number {
    const menge = new Set(ids);
    const wechselnde = this.objekte().filter((o) => menge.has(o.id) && o.kanton !== kanton);
    if (!wechselnde.length) return 0;
    const notizIds = new Set(wechselnde.map((o) => o.id));
    const signaturen = this.mitNachkommen(wechselnde.map((o) => o.signatur));
    const datum = jetztLokal().slice(0, 10);
    const kantonName = KANTONE.find((k) => k.kuerzel === kanton)?.name ?? kanton;
    this.objekte.update((liste) =>
      liste.map((o) =>
        signaturen.has(o.signatur)
          ? {
              ...o,
              kanton,
              lognotizen: notizIds.has(o.id)
                ? [
                    ...o.lognotizen,
                    {
                      datum,
                      autor,
                      rolle: autorRolle,
                      text: `In den Kanton ${kantonName} (${kanton}) verschoben.`,
                    },
                  ]
                : o.lognotizen,
            }
          : o,
      ),
    );
    return wechselnde.length;
  }

  /**
   * Nächste freie Strecken-Nummer eines Kantons (für die automatische
   * Signatur neuer Strecken, Entscheid 90).
   */
  naechsteFreieNummer(kuerzel: string): number {
    let max = 0;
    for (const o of this.objekte()) {
      if (o.ebene !== 'strecke') continue;
      const treffer = new RegExp(`^${kuerzel} (\\d+)$`).exec(o.signatur);
      if (treffer) max = Math.max(max, Number(treffer[1]));
    }
    return max + 1;
  }

  /**
   * Neue Strecke anfordern (Entscheid 90): legt sie im Status «Offen»
   * mit dem Kennzeichen «angefordert» an — ohne Geometrie, mit
   * Arbeitstitel, Begründung und optionaler Ortsangabe. Gibt null
   * zurück, wenn die Signatur bereits vergeben ist.
   */
  streckeAnfordern(anforderung: {
    signatur: string;
    kanton: string;
    name: string;
    begruendung: string;
    position: { lon: number; lat: number } | null;
    autor: string;
    rolle: RolleId;
  }): IvsObjekt | null {
    const signatur = anforderung.signatur.trim();
    if (!signatur || this.bySignatur(signatur)) return null;
    const datum = jetztLokal().slice(0, 10);
    const objekt: IvsObjekt = {
      ...objektAusVorlage({
        signatur,
        ebene: 'strecke',
        name: anforderung.name,
        parent: null,
        status: 'offen',
      }),
      kanton: anforderung.kanton,
      gemeinden: '',
      aufnahmejahr: null,
      substanzgrad: null,
      planer: '',
      angefordert: {
        datum,
        autor: anforderung.autor,
        rolle: anforderung.rolle,
        begruendung: anforderung.begruendung,
        position: anforderung.position,
      },
      lognotizen: [
        {
          datum,
          autor: anforderung.autor,
          rolle: anforderung.rolle,
          text: `Strecke angefordert: ${anforderung.begruendung}`,
        },
      ],
    };
    this.objekte.update((liste) => [...liste, objekt]);
    return objekt;
  }

  /**
   * Signatur einer angeforderten Strecke ändern (Entscheid 90): zieht
   * Ids, Nachkommen-Signaturen und parent-Verweise nach. Gibt das
   * aktualisierte Objekt zurück — oder null, wenn die neue Signatur
   * bereits vergeben ist.
   */
  signaturAendern(id: string, neueSignatur: string, autor: string, autorRolle: RolleId): IvsObjekt | null {
    const objekt = this.byId(id);
    const neu = neueSignatur.trim();
    if (!objekt || !objekt.angefordert || !neu || neu === objekt.signatur) return null;
    if (this.bySignatur(neu)) return null;
    const alt = objekt.signatur;
    const betroffene = this.mitNachkommen([alt]);
    const notiz: Lognotiz = {
      datum: jetztLokal().slice(0, 10),
      autor,
      rolle: autorRolle,
      text: `Signatur geändert: ${alt} → ${neu}.`,
    };
    this.objekte.update((liste) =>
      liste.map((o) => {
        if (!betroffene.has(o.signatur)) return o;
        const signatur = neu + o.signatur.slice(alt.length);
        return {
          ...o,
          signatur,
          id: idAusSignatur(signatur),
          parent: o.parent && betroffene.has(o.parent) ? neu + o.parent.slice(alt.length) : o.parent,
          lognotizen: o.id === id ? [...o.lognotizen, notiz] : o.lognotizen,
        };
      }),
    );
    return this.bySignatur(neu) ?? null;
  }

  /** Löscht ein Objekt mitsamt allen Unterobjekten (07.05). */
  loeschen(id: string): void {
    const objekt = this.byId(id);
    if (!objekt) return;
    const zuLoeschen = this.mitNachkommen([objekt.signatur]);
    this.objekte.update((liste) => liste.filter((o) => !zuLoeschen.has(o.signatur)));
  }

  /** Setzt alles auf den Seed zurück (Werkzeug für Demos). */
  zuruecksetzen(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.objekte.set(SEED_OBJEKTE.map((o) => strukturKopie(o)));
    void this.generierteErgaenzen();
  }
}

function laden(): IvsObjekt[] {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh) {
      const ablage = JSON.parse(roh) as Ablage;
      if (ablage.version === SEED_VERSION && Array.isArray(ablage.objekte)) {
        return ablage.objekte;
      }
    }
  } catch {
    // defekter Stand — neu seeden
  }
  return SEED_OBJEKTE.map((o) => strukturKopie(o));
}

function strukturKopie<T>(wert: T): T {
  return JSON.parse(JSON.stringify(wert)) as T;
}
