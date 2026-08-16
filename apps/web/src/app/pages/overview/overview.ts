import { Component } from '@angular/core';
import { Data } from 'data';
import {
  DashboardShell,
  FoundationPanel,
  WorkspaceHeader,
  WorkspaceSidebar,
} from 'ui';

@Component({
  imports: [
    DashboardShell,
    Data,
    FoundationPanel,
    WorkspaceHeader,
    WorkspaceSidebar,
  ],
  selector: 'app-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class OverviewPage {
  protected readonly title = 'CodePilot';
  protected readonly description =
    'Your repository workspace will appear here once a future CodePilot feature connects it.';
  protected readonly preserveDataDependency = false;
}
