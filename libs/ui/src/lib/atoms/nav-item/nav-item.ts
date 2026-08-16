import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-nav-item',
  standalone: true,
  templateUrl: './nav-item.html',
  styleUrl: './nav-item.css',
})
export class NavItem {
  readonly label = input.required<string>();
  readonly active = input(false);
  readonly disabled = input(false);
}
