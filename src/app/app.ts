import { Component } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

/**
 * Platzhalter-Seite zur Verifikation des Setups. Wird durch die
 * Prototypen-Übersicht ersetzt, sobald der Prototyp gebaut wird.
 */
@Component({
  selector: 'app-root',
  imports: [
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSeparatorImports,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
