import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  readonly type = input('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly disabled = input(false);
}
