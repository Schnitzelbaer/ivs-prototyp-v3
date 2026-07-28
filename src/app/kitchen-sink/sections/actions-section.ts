import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlignCenter,
  lucideAlignLeft,
  lucideAlignRight,
  lucideBold,
  lucideItalic,
  lucidePlus,
  lucideUnderline,
} from '@ng-icons/lucide';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmToggleImports } from '@spartan-ng/helm/toggle';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-actions-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoBlock,
    HlmButtonImports,
    HlmButtonGroupImports,
    HlmToggleImports,
    HlmToggleGroupImports,
    HlmKbdImports,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideBold,
      lucideItalic,
      lucideUnderline,
      lucideAlignLeft,
      lucideAlignCenter,
      lucideAlignRight,
      lucidePlus,
    }),
  ],
  template: `
    <ks-block title="Button" anchor="button" note="Varianten und Grössen">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <button hlmBtn>Default</button>
          <button hlmBtn variant="secondary">Secondary</button>
          <button hlmBtn variant="outline">Outline</button>
          <button hlmBtn variant="ghost">Ghost</button>
          <button hlmBtn variant="destructive">Destructive</button>
          <button hlmBtn variant="link">Link</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button hlmBtn size="xs">xs</button>
          <button hlmBtn size="sm">sm</button>
          <button hlmBtn>default</button>
          <button hlmBtn size="lg">lg</button>
          <button hlmBtn size="icon" aria-label="Hinzufügen">
            <ng-icon name="lucidePlus" />
          </button>
          <button hlmBtn size="icon-sm" variant="outline" aria-label="Hinzufügen">
            <ng-icon name="lucidePlus" />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button hlmBtn disabled>Deaktiviert</button>
          <button hlmBtn variant="outline">
            <ng-icon name="lucidePlus" data-icon="inline-start" />
            Mit Icon
          </button>
        </div>
      </div>
    </ks-block>

    <ks-block title="Button Group" anchor="button-group" note="Gruppierte Aktionen mit Text und Trenner">
      <div class="space-y-4">
        <div hlmButtonGroup>
          <button hlmBtn variant="outline">Strecke</button>
          <button hlmBtn variant="outline">Linienführung</button>
          <button hlmBtn variant="outline">Abschnitt</button>
        </div>
        <div hlmButtonGroup>
          <span hlmButtonGroupText>Version</span>
          <button hlmBtn variant="outline">IVS 1.0</button>
          <div hlmButtonGroupSeparator></div>
          <button hlmBtn variant="outline">IVS 2.0</button>
        </div>
      </div>
    </ks-block>

    <ks-block title="Toggle" anchor="toggle" note="Einzelner Schalter, Varianten default und outline">
      <div class="flex flex-wrap items-center gap-2">
        <button hlmToggle aria-label="Fett">
          <ng-icon name="lucideBold" />
        </button>
        <button hlmToggle variant="outline" aria-label="Kursiv">
          <ng-icon name="lucideItalic" />
        </button>
        <button hlmToggle size="sm" aria-label="Unterstrichen">
          <ng-icon name="lucideUnderline" />
        </button>
        <button hlmToggle size="lg" variant="outline">Mit Text</button>
      </div>
    </ks-block>

    <ks-block title="Toggle Group" anchor="toggle-group" note="Verbunden (spacing 0) und mit Abstand">
      <div class="space-y-4">
        <div hlmToggleGroup variant="outline">
          <button hlmToggleGroupItem value="left" aria-label="Linksbündig">
            <ng-icon name="lucideAlignLeft" />
          </button>
          <button hlmToggleGroupItem value="center" aria-label="Zentriert">
            <ng-icon name="lucideAlignCenter" />
          </button>
          <button hlmToggleGroupItem value="right" aria-label="Rechtsbündig">
            <ng-icon name="lucideAlignRight" />
          </button>
        </div>
        <div hlmToggleGroup [spacing]="2">
          <button hlmToggleGroupItem value="bold" aria-label="Fett">
            <ng-icon name="lucideBold" />
          </button>
          <button hlmToggleGroupItem value="italic" aria-label="Kursiv">
            <ng-icon name="lucideItalic" />
          </button>
        </div>
      </div>
    </ks-block>

    <ks-block title="Kbd" anchor="kbd" note="Tastenkürzel">
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <kbd hlmKbdGroup>
          <kbd hlmKbd>⌘</kbd>
          <kbd hlmKbd>K</kbd>
        </kbd>
        <kbd hlmKbdGroup>
          <kbd hlmKbd>Ctrl</kbd>
          <kbd hlmKbd>S</kbd>
        </kbd>
        <kbd hlmKbd>Esc</kbd>
      </div>
    </ks-block>
  `,
})
export class ActionsSection {}
