import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { EinstellungenStore } from './core/einstellungen-store';

/** Stammdatenverwaltung ist der Fachlichen Administration vorbehalten. */
const nurFachlicheAdministration: CanActivateFn = () =>
  inject(EinstellungenStore).aktiveRolleId() === 'R-03' ? true : inject(Router).parseUrl('/dashboard');

export const routes: Routes = [
  {
    path: 'kitchen-sink',
    loadComponent: () => import('./kitchen-sink/kitchen-sink').then((m) => m.KitchenSink),
    title: 'Kitchen Sink — IVS-Prototyp',
  },
  {
    path: 'karte',
    loadComponent: () => import('./karte/karte-fenster').then((m) => m.KarteFenster),
    title: 'Karte — IVS-Nachführungstool',
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard — IVS-Nachführungstool',
      },
      {
        path: 'objekte',
        loadComponent: () => import('./objekte/objekte').then((m) => m.Objekte),
        title: 'Objekte — IVS-Nachführungstool',
      },
      {
        path: 'objekt/:id',
        loadComponent: () => import('./objekt/objekt-detail').then((m) => m.ObjektDetail),
        title: 'Objekt — IVS-Nachführungstool',
      },
      {
        path: 'panorama',
        loadComponent: () => import('./panorama/panorama').then((m) => m.Panorama),
        title: '360°-Aufnahmen — IVS-Nachführungstool',
      },
      {
        path: 'begehungen',
        loadComponent: () => import('./begehungen/begehungen').then((m) => m.Begehungen),
        title: 'Begehungen — IVS-Nachführungstool',
      },
      {
        path: 'stammdaten',
        loadComponent: () => import('./stammdaten/stammdaten').then((m) => m.Stammdaten),
        canActivate: [nurFachlicheAdministration],
        title: 'Stammdaten — IVS-Nachführungstool',
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
