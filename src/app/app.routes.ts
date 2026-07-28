import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'kitchen-sink',
    loadComponent: () => import('./kitchen-sink/kitchen-sink').then((m) => m.KitchenSink),
    title: 'Kitchen Sink — IVS-Prototyp',
  },
  { path: '', pathMatch: 'full', redirectTo: 'kitchen-sink' },
];
