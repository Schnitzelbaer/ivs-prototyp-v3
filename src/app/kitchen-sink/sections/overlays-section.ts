import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy, lucidePencil, lucideTrash2, lucideUser } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmContextMenuImports } from '@spartan-ng/helm/context-menu';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDrawerImports } from '@spartan-ng/helm/drawer';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmHoverCardImports } from '@spartan-ng/helm/hover-card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-overlays-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucidePencil, lucideCopy, lucideTrash2, lucideUser })],
  imports: [
    DemoBlock,
    NgIcon,
    HlmAlertDialogImports,
    HlmButtonImports,
    HlmCommandImports,
    HlmContextMenuImports,
    HlmDialogImports,
    HlmDrawerImports,
    HlmDropdownMenuImports,
    HlmHoverCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmPopoverImports,
    HlmSheetImports,
    HlmToasterImports,
    HlmTooltipImports,
  ],
  template: `
    <hlm-toaster />

    <ks-block title="Dialog" anchor="dialog" note="Modal mit Header, Inhalt und Footer">
      <hlm-dialog>
        <button hlmDialogTrigger hlmBtn variant="outline">Objektbeschrieb bearbeiten</button>
        <hlm-dialog-content *hlmDialogPortal="let ctx" class="sm:max-w-lg">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>VS 1.2.14 bearbeiten</h3>
            <p hlmDialogDescription>
              Änderungen werden automatisch gespeichert und historisiert.
            </p>
          </hlm-dialog-header>
          <div class="space-y-2 py-2">
            <label hlmLabel for="ks-dialog-name">Bezeichnung</label>
            <input hlmInput id="ks-dialog-name" class="w-full" value="Sengg – Simplon Dorf" />
          </div>
          <hlm-dialog-footer>
            <button hlmBtn variant="outline" hlmDialogClose>Abbrechen</button>
            <button hlmBtn>Speichern</button>
          </hlm-dialog-footer>
        </hlm-dialog-content>
      </hlm-dialog>
    </ks-block>

    <ks-block title="Alert Dialog" anchor="alert-dialog" note="Bestätigung einer nicht umkehrbaren Aktion">
      <hlm-alert-dialog>
        <button hlmAlertDialogTrigger hlmBtn variant="destructive">Objekt nicht-existent setzen</button>
        <hlm-alert-dialog-content *hlmAlertDialogPortal="let ctx">
          <hlm-alert-dialog-header>
            <h3 hlmAlertDialogTitle>Objekt auf nicht-existent setzen?</h3>
            <p hlmAlertDialogDescription>
              Verlinkte Objekte werden gekennzeichnet und müssen überprüft werden. Eine
              Begründung ist Pflicht.
            </p>
          </hlm-alert-dialog-header>
          <hlm-alert-dialog-footer>
            <button hlmAlertDialogCancel>Abbrechen</button>
            <button hlmAlertDialogAction>Setzen</button>
          </hlm-alert-dialog-footer>
        </hlm-alert-dialog-content>
      </hlm-alert-dialog>
    </ks-block>

    <ks-block title="Sheet" anchor="sheet" note="Seitenpanel, hier von rechts">
      <hlm-sheet side="right">
        <button hlmSheetTrigger hlmBtn variant="outline">Filter öffnen</button>
        <hlm-sheet-content *hlmSheetPortal="let ctx">
          <hlm-sheet-header>
            <h3 hlmSheetTitle>Filter</h3>
            <p hlmSheetDescription>Objekte nach Stammdaten einschränken.</p>
          </hlm-sheet-header>
          <div class="space-y-2 px-4">
            <label hlmLabel for="ks-sheet-input">Region</label>
            <input hlmInput id="ks-sheet-input" class="w-full" placeholder="z. B. Bern Mittelland" />
          </div>
          <hlm-sheet-footer>
            <button hlmBtn variant="outline" hlmSheetClose>Zurücksetzen</button>
            <button hlmBtn>Anwenden</button>
          </hlm-sheet-footer>
        </hlm-sheet-content>
      </hlm-sheet>
    </ks-block>

    <ks-block title="Drawer" anchor="drawer" note="Von unten einfahrendes Panel, tablettauglich">
      <hlm-drawer>
        <button hlmDrawerTrigger hlmBtn variant="outline">Notiz im Feld erfassen</button>
        <hlm-drawer-content *hlmDrawerPortal="let ctx">
          <hlm-drawer-header>
            <h3 hlmDrawerTitle>Räumliche Notiz</h3>
            <p hlmDrawerDescription>Wird als Symbol an der gewählten Position angezeigt.</p>
          </hlm-drawer-header>
          <div class="space-y-2 px-4">
            <label hlmLabel for="ks-drawer-input">Notiz</label>
            <input hlmInput id="ks-drawer-input" class="w-full" placeholder="Beobachtung …" />
          </div>
          <hlm-drawer-footer>
            <button hlmBtn>Speichern</button>
            <button hlmBtn variant="outline" hlmDrawerClose>Abbrechen</button>
          </hlm-drawer-footer>
        </hlm-drawer-content>
      </hlm-drawer>
    </ks-block>

    <ks-block title="Popover" anchor="popover" note="Leichtgewichtiges Overlay">
      <hlm-popover sideOffset="5">
        <button hlmPopoverTrigger hlmBtn variant="outline">Darstellung</button>
        <hlm-popover-content *hlmPopoverPortal="let ctx" class="w-72">
          <hlm-popover-header>
            <div hlmPopoverTitle>Kartendarstellung</div>
            <p hlmPopoverDescription>Layer und Deckkraft für die Inventarkarte.</p>
          </hlm-popover-header>
        </hlm-popover-content>
      </hlm-popover>
    </ks-block>

    <ks-block title="Hover Card" anchor="hover-card" note="Vorschau beim Überfahren">
      <hlm-hover-card>
        <button hlmHoverCardTrigger hlmBtn variant="link">VS 1.2.4</button>
        <hlm-hover-card-content *hlmHoverCardPortal class="w-72">
          <div class="flex gap-3">
            <ng-icon name="lucideUser" class="mt-0.5" />
            <div class="space-y-1 text-sm">
              <p class="font-medium">Abschnitt VS 1.2.4</p>
              <p class="text-muted-foreground text-xs">
                Querverweis aus dem Objektbeschrieb. Bedeutung national, viel Substanz.
              </p>
            </div>
          </div>
        </hlm-hover-card-content>
      </hlm-hover-card>
    </ks-block>

    <ks-block title="Tooltip" anchor="tooltip" note="Kurzer Hinweis am Bedienelement">
      <div class="flex flex-wrap gap-3">
        <button hlmBtn variant="outline" hlmTooltip="Gefilterte Liste als Excel exportieren">
          Export
        </button>
        <button hlmBtn variant="outline" hlmTooltip="Snapping auf TLM" position="right">
          Snapping
        </button>
      </div>
    </ks-block>

    <ks-block title="Dropdown Menu" anchor="dropdown-menu" note="Mit Gruppen, Trennern, Kürzeln und Untermenü">
      <button hlmBtn variant="outline" [hlmDropdownMenuTrigger]="objektMenu" align="start">
        Objekt-Aktionen
      </button>

      <ng-template #objektMenu>
        <hlm-dropdown-menu class="w-56">
          <hlm-dropdown-menu-group>
            <hlm-dropdown-menu-label>Bearbeiten</hlm-dropdown-menu-label>
            <button hlmDropdownMenuItem>
              <ng-icon name="lucidePencil" />
              Objektbeschrieb
              <hlm-dropdown-menu-shortcut>⌘E</hlm-dropdown-menu-shortcut>
            </button>
            <button hlmDropdownMenuItem>
              <ng-icon name="lucideCopy" />
              Duplizieren
            </button>
          </hlm-dropdown-menu-group>
          <hlm-dropdown-menu-separator />
          <hlm-dropdown-menu-group>
            <button hlmDropdownMenuItem side="right" align="start" [hlmDropdownMenuSubTrigger]="statusMenu">
              Status wechseln
              <hlm-dropdown-menu-item-sub-indicator />
            </button>
            <button hlmDropdownMenuItem disabled>Freigeben</button>
          </hlm-dropdown-menu-group>
          <hlm-dropdown-menu-separator />
          <button hlmDropdownMenuItem>
            <ng-icon name="lucideTrash2" />
            Löschen
          </button>
        </hlm-dropdown-menu>
      </ng-template>

      <ng-template #statusMenu>
        <hlm-dropdown-menu-sub class="w-48">
          <button hlmDropdownMenuItem>Bereit zur Prüfung</button>
          <button hlmDropdownMenuItem>An Fachlektorat</button>
          <hlm-dropdown-menu-separator />
          <button hlmDropdownMenuItem>Zurück zur Inventarisierung</button>
        </hlm-dropdown-menu-sub>
      </ng-template>
    </ks-block>

    <ks-block title="Context Menu" anchor="context-menu" note="Rechtsklick auf die Fläche">
      <div
        [hlmContextMenuTrigger]="kontextMenu"
        class="text-muted-foreground flex h-28 items-center justify-center rounded-lg border border-dashed text-sm"
      >
        Rechtsklick für Kontextmenü
      </div>

      <ng-template #kontextMenu>
        <hlm-dropdown-menu class="w-48">
          <button hlmDropdownMenuItem>Zur Karte springen</button>
          <button hlmDropdownMenuItem>Kommentar erfassen</button>
          <hlm-dropdown-menu-separator />
          <button hlmDropdownMenuItem>Verlauf anzeigen</button>
        </hlm-dropdown-menu>
      </ng-template>
    </ks-block>

    <ks-block title="Command" anchor="command" note="Befehlspalette mit Gruppen und Kürzeln">
      <hlm-command class="max-w-md rounded-lg border">
        <hlm-command-input placeholder="Objekt oder Befehl suchen …" />
        <hlm-command-list>
          <div *hlmCommandEmptyState hlmCommandEmpty>Kein Treffer.</div>
          <hlm-command-group>
            <hlm-command-group-label>Objekte</hlm-command-group-label>
            <button hlm-command-item value="VS 1">VS 1 — Brig/Glis – Gondo</button>
            <button hlm-command-item value="VS 1.2">VS 1.2 — Saumweg</button>
          </hlm-command-group>
          <hlm-command-separator />
          <hlm-command-group>
            <hlm-command-group-label>Aktionen</hlm-command-group-label>
            <button hlm-command-item value="Report">
              Report generieren
              <hlm-command-shortcut>⌘R</hlm-command-shortcut>
            </button>
            <button hlm-command-item value="Export">
              Liste exportieren
              <hlm-command-shortcut>⌘E</hlm-command-shortcut>
            </button>
          </hlm-command-group>
        </hlm-command-list>
      </hlm-command>
    </ks-block>

    <ks-block title="Sonner" anchor="sonner" note="Toast-Meldungen">
      <div class="flex flex-wrap gap-2">
        <button hlmBtn variant="outline" (click)="showInfo()">Hinweis</button>
        <button hlmBtn variant="outline" (click)="showSuccess()">Erfolg</button>
        <button hlmBtn variant="outline" (click)="showError()">Fehler</button>
      </div>
    </ks-block>
  `,
})
export class OverlaysSection {
  protected showInfo(): void {
    toast('Objekt zugewiesen', {
      description: 'VS 1.2.14 wurde R. Flückiger zugewiesen.',
    });
  }

  protected showSuccess(): void {
    toast.success('Als geprüft gekennzeichnet', {
      description: 'Zeitstempel wurde im Prüfprotokoll gesetzt.',
    });
  }

  protected showError(): void {
    toast.error('Validierung fehlgeschlagen', {
      description: 'Die Geometrie entspricht nicht dem INTERLIS-Modell.',
    });
  }
}
