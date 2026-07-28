import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideLayers, lucideMap, lucideSettings } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmMenubarImports } from '@spartan-ng/helm/menubar';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-navigation-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideMap, lucideFileText, lucideLayers, lucideSettings })],
  imports: [
    DemoBlock,
    NgIcon,
    HlmBadgeImports,
    HlmBreadcrumbImports,
    HlmButtonImports,
    HlmCardImports,
    HlmDropdownMenuImports,
    HlmInputImports,
    HlmLabelImports,
    HlmMenubarImports,
    HlmNavigationMenuImports,
    HlmSidebarImports,
    HlmTabsImports,
  ],
  template: `
    <ks-block title="Breadcrumb" anchor="breadcrumb" note="Pfad durch die Objekthierarchie">
      <nav hlmBreadcrumb>
        <ol hlmBreadcrumbList>
          <li hlmBreadcrumbItem><a hlmBreadcrumbLink href="#breadcrumb">Wallis</a></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><a hlmBreadcrumbLink href="#breadcrumb">VS 1</a></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><hlm-breadcrumb-ellipsis /></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><a hlmBreadcrumbLink href="#breadcrumb">VS 1.2</a></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><span hlmBreadcrumbPage>VS 1.2.14</span></li>
        </ol>
      </nav>
    </ks-block>

    <ks-block title="Tabs" anchor="tabs" note="Kapitel eines Objektbeschriebs">
      <hlm-tabs tab="geschichte" class="w-full">
        <hlm-tabs-list aria-label="Kapitel">
          <button hlmTabsTrigger="geschichte">Geschichte</button>
          <button hlmTabsTrigger="gelaende">Gelände</button>
          <button hlmTabsTrigger="bilder">Bilder</button>
        </hlm-tabs-list>
        <div hlmTabsContent="geschichte">
          <section hlmCard>
            <div hlmCardHeader>
              <h4 hlmCardTitle>Geschichte</h4>
              <p hlmCardDescription>Stand Juli 1993 / RF, Ae</p>
            </div>
            <div hlmCardContent class="text-sm">
              Chronologisch gegliederter Fliesstext mit Literaturzitaten und Querverweisen.
            </div>
          </section>
        </div>
        <div hlmTabsContent="gelaende">
          <section hlmCard>
            <div hlmCardHeader>
              <h4 hlmCardTitle>Gelände</h4>
              <p hlmCardDescription>Aufnahme 24. Juli 1992 / RF</p>
            </div>
            <div hlmCardContent class="text-sm">
              Hangweg mit Stützmauern, Pflästerung und Querabschlägen.
            </div>
          </section>
        </div>
        <div hlmTabsContent="bilder">
          <section hlmCard>
            <div hlmCardHeader>
              <h4 hlmCardTitle>Bilder</h4>
              <p hlmCardDescription>3 Aufnahmen, davon 1 historisch</p>
            </div>
            <div hlmCardContent class="text-sm">
              Metadaten je Bild: Aufnahmedatum, Fotograf, Quelle, Aufnahmestandort.
            </div>
          </section>
        </div>
      </hlm-tabs>
    </ks-block>

    <ks-block title="Navigation Menu" anchor="navigation-menu" note="Hauptnavigation mit Untermenü">
      <nav hlmNavigationMenu>
        <ul hlmNavigationMenuList>
          <li hlmNavigationMenuItem>
            <button hlmNavigationMenuTrigger>Erfassung</button>
            <hlm-navigation-menu-content *hlmNavigationMenuPortal>
              <div class="w-64 space-y-1 p-2">
                <a hlmNavigationMenuLink href="#navigation-menu">Objektbeschrieb bearbeiten</a>
                <a hlmNavigationMenuLink href="#navigation-menu">Kartendaten anpassen</a>
                <a hlmNavigationMenuLink href="#navigation-menu">Bildmaterial ergänzen</a>
              </div>
            </hlm-navigation-menu-content>
          </li>
          <li hlmNavigationMenuItem>
            <button hlmNavigationMenuTrigger>Prüfung</button>
            <hlm-navigation-menu-content *hlmNavigationMenuPortal>
              <div class="w-64 space-y-1 p-2">
                <a hlmNavigationMenuLink href="#navigation-menu">Fachliche Prüfung</a>
                <a hlmNavigationMenuLink href="#navigation-menu">Sprachliche Prüfung</a>
                <a hlmNavigationMenuLink href="#navigation-menu">Prüfregister</a>
              </div>
            </hlm-navigation-menu-content>
          </li>
        </ul>
      </nav>
    </ks-block>

    <ks-block title="Menubar" anchor="menubar" note="Anwendungsleiste">
      <div hlmMenubar>
        <button [hlmMenubarTrigger]="dateiMenu">Datei</button>
        <button [hlmMenubarTrigger]="ansichtMenu">Ansicht</button>
        <button [hlmMenubarTrigger]="hilfeMenu">Hilfe</button>
      </div>

      <ng-template #dateiMenu>
        <hlm-dropdown-menu class="w-48">
          <button hlmDropdownMenuItem>
            Report generieren
            <hlm-dropdown-menu-shortcut>⌘R</hlm-dropdown-menu-shortcut>
          </button>
          <button hlmDropdownMenuItem>Export INTERLIS</button>
          <hlm-dropdown-menu-separator />
          <button hlmDropdownMenuItem>Schliessen</button>
        </hlm-dropdown-menu>
      </ng-template>
      <ng-template #ansichtMenu>
        <hlm-dropdown-menu class="w-48">
          <button hlmDropdownMenuItem>Karte</button>
          <button hlmDropdownMenuItem>Liste</button>
          <button hlmDropdownMenuItem>Geteilte Ansicht</button>
        </hlm-dropdown-menu>
      </ng-template>
      <ng-template #hilfeMenu>
        <hlm-dropdown-menu class="w-48">
          <button hlmDropdownMenuItem>Arbeitshilfe</button>
          <button hlmDropdownMenuItem>Terminologie-Handbuch</button>
        </hlm-dropdown-menu>
      </ng-template>
    </ks-block>

    <ks-block title="Sidebar" anchor="sidebar" note="Vollständige Werkbank-Navigation, hier eingebettet">
      <div hlmSidebarWrapper class="h-80 min-h-0 overflow-hidden rounded-lg border">
        <aside hlmSidebar collapsible="none" class="h-full w-56">
          <div hlmSidebarHeader class="px-2 py-3">
            <span class="text-sm font-semibold">IVS</span>
          </div>
          <div hlmSidebarContent>
            <div hlmSidebarGroup>
              <div hlmSidebarGroupLabel>Arbeiten</div>
              <div hlmSidebarGroupContent>
                <ul hlmSidebarMenu>
                  <li hlmSidebarMenuItem>
                    <button hlmSidebarMenuButton isActive>
                      <ng-icon name="lucideMap" />
                      Karte
                    </button>
                  </li>
                  <li hlmSidebarMenuItem>
                    <button hlmSidebarMenuButton>
                      <ng-icon name="lucideFileText" />
                      Objekte
                      <span hlmSidebarMenuBadge>24</span>
                    </button>
                  </li>
                  <li hlmSidebarMenuItem>
                    <button hlmSidebarMenuButton>
                      <ng-icon name="lucideLayers" />
                      Arbeitspakete
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div hlmSidebarSeparator></div>
            <div hlmSidebarGroup>
              <div hlmSidebarGroupLabel>System</div>
              <div hlmSidebarGroupContent>
                <ul hlmSidebarMenu>
                  <li hlmSidebarMenuItem>
                    <button hlmSidebarMenuButton>
                      <ng-icon name="lucideSettings" />
                      Stammdaten
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div hlmSidebarFooter class="px-2 py-3">
            <span hlmBadge variant="secondary">Fachlektorat</span>
          </div>
        </aside>
        <main hlmSidebarInset class="p-4">
          <p class="text-muted-foreground text-sm">Inhaltsbereich neben der Sidebar.</p>
        </main>
      </div>
    </ks-block>
  `,
})
export class NavigationSection {}
