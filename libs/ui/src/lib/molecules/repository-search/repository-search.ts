import { Component, input } from '@angular/core';
import { Input } from '../../atoms/input/input';

@Component({
  selector: 'lib-repository-search',
  standalone: true,
  imports: [Input],
  templateUrl: './repository-search.html',
  styleUrl: './repository-search.css',
})
export class RepositorySearch {
  readonly placeholder = input('Search repositories');
  readonly disabled = input(false);
}
