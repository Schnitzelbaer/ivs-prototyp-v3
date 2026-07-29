import { Routes } from '@angular/router';

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
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
