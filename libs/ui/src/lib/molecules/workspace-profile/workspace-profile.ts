import { Component, input } from '@angular/core';
import { Avatar } from '../../atoms/avatar/avatar';

@Component({
  selector: 'lib-workspace-profile',
  standalone: true,
  imports: [Avatar],
  templateUrl: './workspace-profile.html',
  styleUrl: './workspace-profile.css',
})
export class WorkspaceProfile {
  readonly name = input('CodePilot workspace');
  readonly subtitle = input('Static foundation');
  readonly initials = input('CP');
}
