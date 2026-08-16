import { Component, input } from '@angular/core';

export type Status = 'success' | 'warning' | 'error' | 'muted';

@Component({
  selector: 'lib-status-dot',
  standalone: true,
  templateUrl: './status-dot.html',
  styleUrl: './status-dot.css',
})
export class StatusDot {
  readonly status = input<Status>('muted');
  readonly label = input('Status');
}
