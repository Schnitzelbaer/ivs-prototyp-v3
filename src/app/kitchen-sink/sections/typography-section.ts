import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmTypographyImports } from '@spartan-ng/helm/typography';
import { DemoBlock } from '../demo-block';

@Component({
  selector: 'ks-typography-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoBlock, HlmTypographyImports],
  template: `
    <ks-block title="Typography" anchor="typography" note="hlmH1–hlmH4, hlmP, hlmLead, hlmLarge, hlmSmall, hlmMuted, hlmBlockquote, hlmCode, hlmUl">
      <div class="space-y-4">
        <h1 hlmH1>Strecke VS 1</h1>
        <h2 hlmH2>Linienführung VS 1.2 — Saumweg</h2>
        <h3 hlmH3>Abschnitt VS 1.2.14 — Sengg – Simplon Dorf</h3>
        <h4 hlmH4>Gelände</h4>
        <p hlmLead>
          Beschreibung der erhaltenen Wegsubstanz zwischen Sengg und Simplon Dorf.
        </p>
        <p hlmP>
          Der Hangweg ist über weite Strecken mit Trockenmauern unterfangen. Die Pflästerung
          wurde 1992 teilweise frei gelegt; Querabschläge aus steilgestellten Steinplatten
          sind in mehreren Abschnitten erhalten.
        </p>
        <blockquote hlmBlockquote>
          Historische Verkehrswege von nationaler Bedeutung, die nicht Teil des
          Bundesinventars sind, erscheinen in der Inventarkarte als graue Linien.
        </blockquote>
        <ul hlmUl>
          <li>Wegoberfläche: Naturweg, teilweise gepflästert</li>
          <li>Wegbegleiter: Stundenstein, Brücke, Gasthaus</li>
          <li>Substanzgrad: viel Substanz</li>
        </ul>
        <p hlmLarge>Bedeutung: national</p>
        <p hlmSmall>Stand Juli 1993 / RF, Ae</p>
        <p hlmMuted>Aufnahme 24. Juli 1992 / RF</p>
        <p hlmP>
          Signatur im Code: <code hlmCode>VS 1.2.14</code>
        </p>
      </div>
    </ks-block>
  `,
})
export class TypographySection {}
