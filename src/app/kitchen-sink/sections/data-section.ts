import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DemoBlock } from '../demo-block';

interface ObjektRow {
  readonly signatur: string;
  readonly name: string;
  readonly typ: string;
  readonly status: string;
  readonly bearbeiter: string;
  readonly laenge: string;
}

@Component({
  selector: 'ks-data-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoBlock, HlmBadgeImports, HlmPaginationImports, HlmTableImports],
  template: `
    <ks-block title="Table" anchor="table" note="Übersicht der Bundes-Objekte">
      <div hlmTableContainer>
        <table hlmTable>
          <caption hlmCaption>
            Gefilterte Objekte im Arbeitspaket Bern Mittelland
          </caption>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh>Signatur</th>
              <th hlmTh>Bezeichnung</th>
              <th hlmTh>Typ</th>
              <th hlmTh>Status</th>
              <th hlmTh>Bearbeiter</th>
              <th hlmTh class="text-end">Länge</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (row of rows; track row.signatur) {
              <tr hlmTr>
                <td hlmTd class="font-medium">{{ row.signatur }}</td>
                <td hlmTd>{{ row.name }}</td>
                <td hlmTd>{{ row.typ }}</td>
                <td hlmTd><span hlmBadge variant="secondary">{{ row.status }}</span></td>
                <td hlmTd>{{ row.bearbeiter }}</td>
                <td hlmTd class="text-end tabular-nums">{{ row.laenge }}</td>
              </tr>
            }
          </tbody>
          <tfoot hlmTFoot>
            <tr hlmTr>
              <td hlmTd colspan="5">Total</td>
              <td hlmTd class="text-end tabular-nums">12.94 km</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ks-block>

    <ks-block title="Pagination" anchor="pagination" note="Manuell zusammengesetzt und als fertige Komponente">
      <div class="space-y-6">
        <nav hlmPagination>
          <ul hlmPaginationContent>
            <li hlmPaginationItem>
              <hlm-pagination-previous link="./" />
            </li>
            <li hlmPaginationItem>
              <a hlmPaginationLink link="./">1</a>
            </li>
            <li hlmPaginationItem>
              <a hlmPaginationLink link="./" isActive>2</a>
            </li>
            <li hlmPaginationItem>
              <a hlmPaginationLink link="./">3</a>
            </li>
            <li hlmPaginationItem>
              <hlm-pagination-ellipsis />
            </li>
            <li hlmPaginationItem>
              <hlm-pagination-next link="./" />
            </li>
          </ul>
        </nav>

        <hlm-numbered-pagination
          [currentPage]="2"
          [itemsPerPage]="25"
          [totalItems]="1116"
          [pageSizes]="[10, 25, 50]"
        />
      </div>
    </ks-block>
  `,
})
export class DataSection {
  protected readonly rows: readonly ObjektRow[] = [
    {
      signatur: 'BE 964',
      name: 'Bern – Belp',
      typ: 'Strecke',
      status: 'In Bearbeitung',
      bearbeiter: 'R. Flückiger',
      laenge: '3.26 km',
    },
    {
      signatur: 'BE 916',
      name: 'Köniz – Schwarzenburg',
      typ: 'Strecke',
      status: 'Bereit zur Prüfung',
      bearbeiter: 'K. Aerni',
      laenge: '3.20 km',
    },
    {
      signatur: 'BE 968.2',
      name: 'Hohlweg Chutzen',
      typ: 'Linienführung',
      status: 'In Prüfung',
      bearbeiter: 'R. Flückiger',
      laenge: '3.06 km',
    },
    {
      signatur: 'BE 917.1.4',
      name: 'Steinbogenbrücke Sense',
      typ: 'Abschnitt',
      status: 'Geprüft',
      bearbeiter: 'M. Bieri',
      laenge: '0.42 km',
    },
    {
      signatur: 'BE 966',
      name: 'Worb – Grosshöchstetten',
      typ: 'Strecke',
      status: 'Freigegeben',
      bearbeiter: 'K. Aerni',
      laenge: '2.92 km',
    },
  ];
}
