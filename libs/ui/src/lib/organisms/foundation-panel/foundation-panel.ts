import { Component, input } from '@angular/core';
import { Badge } from '../../atoms/badge/badge';
import { Card } from '../../atoms/card/card';
import { CardSection } from '../../atoms/card-section/card-section';

@Component({
  selector: 'lib-foundation-panel',
  standalone: true,
  imports: [Badge, Card, CardSection],
  templateUrl: './foundation-panel.html',
  styleUrl: './foundation-panel.css',
})
export class FoundationPanel {
  readonly label = input('Foundation');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
