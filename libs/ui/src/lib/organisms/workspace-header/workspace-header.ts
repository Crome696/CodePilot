import { Component, input } from '@angular/core';
import { Status, StatusDot } from '../../atoms/status-dot/status-dot';

@Component({
  selector: 'lib-workspace-header',
  standalone: true,
  imports: [StatusDot],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.css',
})
export class WorkspaceHeader {
  readonly repositoryContext = input('repository / context pending');
  readonly status = input<Status>('muted');
  readonly statusLabel = input('System checks pending');
}
