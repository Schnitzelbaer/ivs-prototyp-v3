import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideFileSearch,
  lucideInfo,
  lucideMap,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmAspectRatioImports } from '@spartan-ng/helm/aspect-ratio';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-display-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoBlock,
    HlmAlertImports,
    HlmAspectRatioImports,
    HlmAvatarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmItemImports,
    HlmProgressImports,
    HlmSeparatorImports,
    HlmSkeletonImports,
    HlmSpinnerImports,
    NgIcon,
  ],
  providers: [
    provideIcons({ lucideInfo, lucideTriangleAlert, lucideCircleAlert, lucideFileSearch, lucideMap }),
  ],
  template: `
    <ks-block title="Badge" anchor="badge" note="Auch als Status-Kennzeichnung der Workflow-Stati">
      <div class="flex flex-wrap items-center gap-2">
        <span hlmBadge>Default</span>
        <span hlmBadge variant="secondary">Secondary</span>
        <span hlmBadge variant="outline">Outline</span>
        <span hlmBadge variant="destructive">Destructive</span>
      </div>
    </ks-block>

    <ks-block title="Alert" anchor="alert" note="Mit Icon, Titel, Beschreibung und Aktion">
      <div class="space-y-3">
        <div hlmAlert>
          <ng-icon name="lucideInfo" />
          <h4 hlmAlertTitle>Automatisches Speichern aktiv</h4>
          <p hlmAlertDescription>
            Änderungen am Objektbeschrieb werden laufend gespeichert.
          </p>
        </div>
        <div hlmAlert variant="destructive">
          <ng-icon name="lucideTriangleAlert" />
          <h4 hlmAlertTitle>Validierung fehlgeschlagen</h4>
          <p hlmAlertDescription>
            Die Geometrie entspricht nicht dem INTERLIS-Modell.
          </p>
          <div hlmAlertAction>
            <button hlmBtn size="xs" variant="outline">Details</button>
          </div>
        </div>
        <div hlmAlert>
          <ng-icon name="lucideCircleAlert" />
          <h4 hlmAlertTitle>Ohne Beschreibung</h4>
        </div>
      </div>
    </ks-block>

    <ks-block title="Avatar" anchor="avatar" note="Grössen, Fallback und Gruppe">
      <div class="flex flex-wrap items-center gap-4">
        <hlm-avatar size="sm">
          <span hlmAvatarFallback>RF</span>
        </hlm-avatar>
        <hlm-avatar>
          <span hlmAvatarFallback>Ae</span>
        </hlm-avatar>
        <hlm-avatar size="lg">
          <span hlmAvatarFallback>KA</span>
        </hlm-avatar>
        <div hlmAvatarGroup>
          <hlm-avatar><span hlmAvatarFallback>RF</span></hlm-avatar>
          <hlm-avatar><span hlmAvatarFallback>Ae</span></hlm-avatar>
          <hlm-avatar><span hlmAvatarFallback>KA</span></hlm-avatar>
          <span hlmAvatarGroupCount>+3</span>
        </div>
      </div>
    </ks-block>

    <ks-block title="Card" anchor="card" note="Header, Content, Footer und Action">
      <div hlmCard class="max-w-md">
        <div hlmCardHeader>
          <h4 hlmCardTitle>VS 1.2.14 — Sengg – Simplon Dorf</h4>
          <p hlmCardDescription>Abschnitt · Kanton Wallis · Bedeutung national</p>
          <div hlmCardAction>
            <span hlmBadge variant="secondary">In Prüfung</span>
          </div>
        </div>
        <div hlmCardContent>
          <p class="text-sm">
            Hangweg mit Trockenmauern und teilweise frei gelegter Pflästerung. Aufnahme
            24. Juli 1992 / RF.
          </p>
        </div>
        <div hlmCardFooter class="gap-2">
          <button hlmBtn size="sm">Öffnen</button>
          <button hlmBtn size="sm" variant="outline">Verlauf</button>
        </div>
      </div>
    </ks-block>

    <ks-block title="Item" anchor="item" note="Listenzeile mit Medium, Inhalt und Aktionen">
      <div hlmItemGroup class="max-w-lg">
        <div hlmItem>
          <div hlmItemMedia>
            <ng-icon name="lucideMap" />
          </div>
          <div hlmItemContent>
            <div hlmItemTitle>VS 1.2 — Saumweg</div>
            <div hlmItemDescription>Linienführung · 12 Abschnitte</div>
          </div>
          <div hlmItemActions>
            <button hlmBtn size="sm" variant="ghost">Öffnen</button>
          </div>
        </div>
        <div hlmItemSeparator></div>
        <div hlmItem>
          <div hlmItemMedia>
            <ng-icon name="lucideMap" />
          </div>
          <div hlmItemContent>
            <div hlmItemTitle>VS 1.3 — Fahrweg</div>
            <div hlmItemDescription>Linienführung · 8 Abschnitte</div>
          </div>
          <div hlmItemActions>
            <button hlmBtn size="sm" variant="ghost">Öffnen</button>
          </div>
        </div>
      </div>
    </ks-block>

    <ks-block title="Empty" anchor="empty" note="Leerzustand einer gefilterten Liste">
      <div hlmEmpty>
        <div hlmEmptyHeader>
          <div hlmEmptyMedia variant="icon">
            <ng-icon name="lucideFileSearch" />
          </div>
          <div hlmEmptyTitle>Keine Objekte gefunden</div>
          <div hlmEmptyDescription>
            Für die gewählten Filter gibt es keine Bundes-Objekte. Filter zurücksetzen oder
            Gebiet wechseln.
          </div>
        </div>
        <div hlmEmptyContent>
          <button hlmBtn size="sm" variant="outline">Filter zurücksetzen</button>
        </div>
      </div>
    </ks-block>

    <ks-block title="Progress" anchor="progress" note="Bearbeitungsfortschritt">
      <div class="max-w-md space-y-4">
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span>Arbeitspaket Bern Mittelland</span>
            <span class="text-muted-foreground">72 %</span>
          </div>
          <hlm-progress [value]="72">
            <hlm-progress-indicator />
          </hlm-progress>
        </div>
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span>Arbeitspaket Oberland</span>
            <span class="text-muted-foreground">28 %</span>
          </div>
          <hlm-progress [value]="28">
            <hlm-progress-indicator />
          </hlm-progress>
        </div>
      </div>
    </ks-block>

    <ks-block title="Skeleton &amp; Spinner" anchor="skeleton" note="Ladezustände">
      <div class="flex flex-wrap items-start gap-8">
        <div class="w-64 space-y-2">
          <div hlmSkeleton class="h-4 w-3/4"></div>
          <div hlmSkeleton class="h-4 w-full"></div>
          <div hlmSkeleton class="h-4 w-5/6"></div>
        </div>
        <hlm-spinner />
      </div>
    </ks-block>

    <ks-block title="Separator" anchor="separator" note="Horizontal und vertikal">
      <div class="space-y-4">
        <div hlmSeparator></div>
        <div class="flex h-8 items-center gap-4 text-sm">
          <span>Strecke</span>
          <div hlmSeparator orientation="vertical"></div>
          <span>Linienführung</span>
          <div hlmSeparator orientation="vertical"></div>
          <span>Abschnitt</span>
        </div>
      </div>
    </ks-block>

    <ks-block title="Aspect Ratio" anchor="aspect-ratio" note="Platzhalter für Kartenausschnitt 16:9">
      <div class="max-w-md">
        <div hlmAspectRatio="16/9" class="bg-muted flex items-center justify-center rounded-lg">
          <span class="text-muted-foreground text-sm">Kartenausschnitt</span>
        </div>
      </div>
    </ks-block>
  `,
})
export class DisplaySection {}
