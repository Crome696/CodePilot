import { Component, input } from '@angular/core';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'outline'
  | 'blue'
  | 'violet';

@Component({
  selector: 'lib-badge',
  standalone: true,
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  readonly variant = input<BadgeVariant>('default');
}
