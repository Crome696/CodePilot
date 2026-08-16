import { Component, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-avatar',
  standalone: true,
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  readonly src = input('');
  readonly alt = input('');
  readonly initials = input('');
  readonly size = input<AvatarSize>('md');
}
