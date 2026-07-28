import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideSearch } from '@ng-icons/lucide';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCalendarImports } from '@spartan-ng/helm/calendar';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmInputOtpImports } from '@spartan-ng/helm/input-otp';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { BrnInputOtpImports } from '@spartan-ng/brain/input-otp';
import { DemoBlock } from '../demo-block';

interface Option {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'ks-forms-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter(), provideIcons({ lucideMail, lucideSearch })],
  imports: [
    DemoBlock,
    FormsModule,
    NgIcon,
    HlmAutocompleteImports,
    HlmButtonImports,
    HlmCalendarImports,
    HlmCheckboxImports,
    HlmComboboxImports,
    HlmDatePickerImports,
    HlmFieldImports,
    HlmInputImports,
    HlmInputGroupImports,
    HlmInputOtpImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    HlmRadioGroupImports,
    HlmSelectImports,
    HlmSliderImports,
    HlmSwitchImports,
    HlmTextareaImports,
    BrnInputOtpImports,
  ],
  template: `
    <ks-block title="Label &amp; Input" anchor="input" note="Standard, deaktiviert und ungültig">
      <div class="grid max-w-md gap-4">
        <div class="space-y-2">
          <label hlmLabel for="ks-signature">Signatur</label>
          <input hlmInput id="ks-signature" class="w-full" placeholder="z. B. VS 1.2.14" />
        </div>
        <div class="space-y-2">
          <label hlmLabel for="ks-locked">Objektnummer (gesperrt)</label>
          <input hlmInput id="ks-locked" class="w-full" value="1289" disabled />
        </div>
      </div>
    </ks-block>

    <ks-block title="Textarea" anchor="textarea" note="Mehrzeiliger Objektbeschrieb">
      <div class="max-w-md space-y-2">
        <label hlmLabel for="ks-text">Gelände</label>
        <textarea
          hlmTextarea
          id="ks-text"
          class="w-full"
          rows="4"
          placeholder="Beschreibung der erhaltenen Wegsubstanz …"
        ></textarea>
      </div>
    </ks-block>

    <ks-block title="Input Group" anchor="input-group" note="Mit Addon, Text und Button">
      <div class="grid max-w-md gap-3">
        <div hlmInputGroup>
          <div hlmInputGroupAddon>
            <ng-icon name="lucideSearch" />
          </div>
          <input hlmInputGroupInput placeholder="Volltextsuche" />
        </div>
        <div hlmInputGroup>
          <div hlmInputGroupAddon>
            <ng-icon name="lucideMail" />
          </div>
          <input hlmInputGroupInput placeholder="Kommentar an Fachlektorat" />
          <div hlmInputGroupAddon align="inline-end">
            <button hlmInputGroupButton>Senden</button>
          </div>
        </div>
      </div>
    </ks-block>

    <ks-block title="Field" anchor="field" note="Formularfeld mit Titel, Beschreibung und Fehler">
      <div hlmFieldGroup class="max-w-md">
        <fieldset hlmFieldSet>
          <legend hlmFieldLegend>Einstufung</legend>
          <div hlmField>
            <label hlmFieldLabel for="ks-field-input">Begründung</label>
            <input hlmInput id="ks-field-input" class="w-full" placeholder="Pflichtfeld" />
            <div hlmFieldDescription>
              Textuelle Begründung der Einstufung gemäss Anforderung 07.15.
            </div>
          </div>
          <hlm-field-separator />
          <div hlmField>
            <label hlmFieldLabel for="ks-field-error">Bedeutung</label>
            <input hlmInput id="ks-field-error" class="w-full" value="" />
            <hlm-field-error>Bitte eine Bedeutung wählen.</hlm-field-error>
          </div>
        </fieldset>
      </div>
    </ks-block>

    <ks-block title="Checkbox" anchor="checkbox" note="Aktiv, unbestimmt und deaktiviert">
      <div class="space-y-3">
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-checkbox [checked]="true" />
          Nur eigene Objekte anzeigen
        </label>
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-checkbox [indeterminate]="true" />
          Alle Abschnitte auswählen
        </label>
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-checkbox disabled />
          Nach Freigabe gesperrt
        </label>
      </div>
    </ks-block>

    <ks-block title="Radio Group" anchor="radio-group" note="Bedeutung eines Objekts">
      <hlm-radio-group [(ngModel)]="bedeutung" class="space-y-2">
        @for (option of bedeutungen; track option.value) {
          <label class="flex items-center gap-2 text-sm" hlmLabel>
            <hlm-radio [value]="option.value">
              <hlm-radio-indicator />
            </hlm-radio>
            {{ option.label }}
          </label>
        }
      </hlm-radio-group>
    </ks-block>

    <ks-block title="Switch" anchor="switch" note="Ein- und Ausschalter">
      <div class="space-y-3">
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-switch [checked]="true" />
          Snapping auf TLM aktiv
        </label>
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-switch size="sm" />
          Nicht-existente Objekte einblenden
        </label>
        <label class="flex items-center gap-2 text-sm" hlmLabel>
          <hlm-switch disabled />
          Deaktiviert
        </label>
      </div>
    </ks-block>

    <ks-block title="Native Select" anchor="native-select" note="Einfaches HTML-Select">
      <hlm-native-select class="max-w-xs">
        <optgroup hlmNativeSelectOptGroup label="Substanzgrad">
          <option hlmNativeSelectOption value="viel">viel Substanz</option>
          <option hlmNativeSelectOption value="mit">mit Substanz</option>
          <option hlmNativeSelectOption value="wenig">wenig Substanz</option>
          <option hlmNativeSelectOption value="ohne">ohne Substanz</option>
        </optgroup>
      </hlm-native-select>
    </ks-block>

    <ks-block title="Select" anchor="select" note="Overlay-Select mit Gruppe und Label">
      <hlm-select class="max-w-xs">
        <hlm-select-trigger class="w-56">
          <hlm-select-value placeholder="Status wählen" />
        </hlm-select-trigger>
        <hlm-select-content *hlmSelectPortal>
          <hlm-select-group>
            <hlm-select-label>Workflow-Status</hlm-select-label>
            @for (status of stati; track status.value) {
              <hlm-select-item [value]="status.value">{{ status.label }}</hlm-select-item>
            }
          </hlm-select-group>
        </hlm-select-content>
      </hlm-select>
    </ks-block>

    <ks-block title="Combobox" anchor="combobox" note="Suchbare Auswahl">
      <hlm-combobox class="max-w-xs">
        <hlm-combobox-input placeholder="Kanton wählen" />
        <hlm-combobox-content *hlmComboboxPortal>
          <hlm-combobox-empty>Kein Treffer.</hlm-combobox-empty>
          <div hlmComboboxList>
            @for (kanton of kantone; track kanton.value) {
              <hlm-combobox-item [value]="kanton">{{ kanton.label }}</hlm-combobox-item>
            }
          </div>
        </hlm-combobox-content>
      </hlm-combobox>
    </ks-block>

    <ks-block title="Autocomplete" anchor="autocomplete" note="Freitext mit Vorschlägen">
      <hlm-autocomplete class="max-w-xs">
        <hlm-autocomplete-input placeholder="Wegbegleiter suchen" />
        <hlm-autocomplete-content *hlmAutocompletePortal>
          <hlm-autocomplete-empty>Kein Treffer.</hlm-autocomplete-empty>
          <div hlmAutocompleteList>
            @for (w of wegbegleiter; track w.value) {
              <hlm-autocomplete-item [value]="w">{{ w.label }}</hlm-autocomplete-item>
            }
          </div>
        </hlm-autocomplete-content>
      </hlm-autocomplete>
    </ks-block>

    <ks-block title="Slider" anchor="slider" note="Wert und Bereich">
      <div class="max-w-md space-y-6">
        <hlm-slider [value]="[40]" [min]="0" [max]="100" aria-label="Deckkraft" />
        <hlm-slider
          [value]="[20, 70]"
          [min]="0"
          [max]="100"
          [step]="10"
          [showTicks]="true"
          aria-label="Zeitraum"
        />
      </div>
    </ks-block>

    <ks-block title="Input OTP" anchor="input-otp" note="Sechsstelliger Code mit Trenner">
      <brn-input-otp hlmInputOtp maxLength="6">
        <div hlmInputOtpGroup>
          <hlm-input-otp-slot [index]="0" />
          <hlm-input-otp-slot [index]="1" />
          <hlm-input-otp-slot [index]="2" />
        </div>
        <hlm-input-otp-separator />
        <div hlmInputOtpGroup>
          <hlm-input-otp-slot [index]="3" />
          <hlm-input-otp-slot [index]="4" />
          <hlm-input-otp-slot [index]="5" />
        </div>
      </brn-input-otp>
    </ks-block>

    <ks-block title="Calendar" anchor="calendar" note="Einzeldatum">
      <hlm-calendar />
    </ks-block>

    <ks-block title="Date Picker" anchor="date-picker" note="Kalender im Popover">
      <hlm-date-picker>
        <hlm-date-picker-trigger buttonId="ks-date">Aufnahmedatum</hlm-date-picker-trigger>
      </hlm-date-picker>
    </ks-block>
  `,
})
export class FormsSection {
  protected readonly bedeutung = signal('national');

  protected readonly bedeutungen: readonly Option[] = [
    { value: 'national', label: 'National' },
    { value: 'regional', label: 'Regional' },
    { value: 'lokal', label: 'Lokal' },
  ];

  protected readonly stati: readonly Option[] = [
    { value: 'zugewiesen', label: 'Zugewiesen' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung' },
    { value: 'bereit_zur_pruefung', label: 'Bereit zur Prüfung' },
    { value: 'in_pruefung', label: 'In Prüfung' },
    { value: 'korrektur', label: 'Korrektur' },
    { value: 'geprueft', label: 'Geprüft' },
    { value: 'freigegeben', label: 'Freigegeben' },
    { value: 'publiziert', label: 'Publiziert' },
  ];

  protected readonly kantone: readonly Option[] = [
    { value: 'be', label: 'Bern' },
    { value: 'vs', label: 'Wallis' },
    { value: 'gr', label: 'Graubünden' },
    { value: 'ti', label: 'Tessin' },
    { value: 'ur', label: 'Uri' },
  ];

  protected readonly wegbegleiter: readonly Option[] = [
    { value: 'gasthaus', label: 'Gasthaus Traube' },
    { value: 'bruecke', label: 'Steinbogenbrücke' },
    { value: 'stundenstein', label: 'Stundenstein' },
    { value: 'kapelle', label: 'Wegkapelle' },
  ];
}
