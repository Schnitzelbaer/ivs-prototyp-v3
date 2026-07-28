import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { LayoutSection } from './sections/layout-section';
import { NavigationSection } from './sections/navigation-section';
import { OverlaysSection } from './sections/overlays-section';
import { DataSection } from './sections/data-section';
import { FormsSection } from './sections/forms-section';
import { DisplaySection } from './sections/display-section';
import { ActionsSection } from './sections/actions-section';
import { TypographySection } from './sections/typography-section';

interface NavEntry {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'ks-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, TypographySection, ActionsSection, DisplaySection, FormsSection, DataSection, OverlaysSection, NavigationSection, LayoutSection],
  templateUrl: './kitchen-sink.html',
})
export class KitchenSink {
  protected readonly dark = signal(false);
  protected readonly themeLabel = computed(() => (this.dark() ? 'Hell' : 'Dunkel'));

  protected readonly nav: readonly NavEntry[] = [
    { id: 'typography', label: 'Typography' },
    { id: 'button', label: 'Button' },
    { id: 'button-group', label: 'Button Group' },
    { id: 'toggle', label: 'Toggle' },
    { id: 'toggle-group', label: 'Toggle Group' },
    { id: 'kbd', label: 'Kbd' },
    { id: 'badge', label: 'Badge' },
    { id: 'alert', label: 'Alert' },
    { id: 'avatar', label: 'Avatar' },
    { id: 'card', label: 'Card' },
    { id: 'item', label: 'Item' },
    { id: 'empty', label: 'Empty' },
    { id: 'progress', label: 'Progress' },
    { id: 'skeleton', label: 'Skeleton & Spinner' },
    { id: 'separator', label: 'Separator' },
    { id: 'aspect-ratio', label: 'Aspect Ratio' },
    { id: 'input', label: 'Input' },
    { id: 'textarea', label: 'Textarea' },
    { id: 'input-group', label: 'Input Group' },
    { id: 'field', label: 'Field' },
    { id: 'checkbox', label: 'Checkbox' },
    { id: 'radio-group', label: 'Radio Group' },
    { id: 'switch', label: 'Switch' },
    { id: 'native-select', label: 'Native Select' },
    { id: 'select', label: 'Select' },
    { id: 'combobox', label: 'Combobox' },
    { id: 'autocomplete', label: 'Autocomplete' },
    { id: 'slider', label: 'Slider' },
    { id: 'input-otp', label: 'Input OTP' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'date-picker', label: 'Date Picker' },
    { id: 'table', label: 'Table' },
    { id: 'pagination', label: 'Pagination' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'alert-dialog', label: 'Alert Dialog' },
    { id: 'sheet', label: 'Sheet' },
    { id: 'drawer', label: 'Drawer' },
    { id: 'popover', label: 'Popover' },
    { id: 'hover-card', label: 'Hover Card' },
    { id: 'tooltip', label: 'Tooltip' },
    { id: 'dropdown-menu', label: 'Dropdown Menu' },
    { id: 'context-menu', label: 'Context Menu' },
    { id: 'command', label: 'Command' },
    { id: 'sonner', label: 'Sonner' },
    { id: 'breadcrumb', label: 'Breadcrumb' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'navigation-menu', label: 'Navigation Menu' },
    { id: 'menubar', label: 'Menubar' },
    { id: 'sidebar', label: 'Sidebar' },
    { id: 'accordion', label: 'Accordion' },
    { id: 'collapsible', label: 'Collapsible' },
    { id: 'carousel', label: 'Carousel' },
    { id: 'resizable', label: 'Resizable' },
    { id: 'scroll-area', label: 'Scroll Area' },
  ];

  protected toggleTheme(): void {
    this.dark.update((v) => !v);
    document.documentElement.classList.toggle('dark', this.dark());
  }
}
