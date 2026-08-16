import { Component, input } from '@angular/core';
import { NavItem } from '../../atoms/nav-item/nav-item';
import { Separator } from '../../atoms/separator/separator';
import { RepositorySearch } from '../../molecules/repository-search/repository-search';
import { WorkspaceProfile } from '../../molecules/workspace-profile/workspace-profile';

export type NavigationIcon =
  | 'overview'
  | 'repositories'
  | 'issues'
  | 'pull-requests'
  | 'commits'
  | 'branches'
  | 'validation'
  | 'settings';

export interface NavigationItem {
  readonly label: string;
  readonly icon: NavigationIcon;
}

export const DEFAULT_NAV_ITEMS: readonly NavigationItem[] = [
  { label: 'Overview', icon: 'overview' },
  { label: 'Repositories', icon: 'repositories' },
  { label: 'Issues', icon: 'issues' },
  { label: 'Pull Requests', icon: 'pull-requests' },
  { label: 'Commits', icon: 'commits' },
  { label: 'Branches', icon: 'branches' },
  { label: 'Validation', icon: 'validation' },
  { label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'lib-workspace-sidebar',
  standalone: true,
  imports: [NavItem, RepositorySearch, Separator, WorkspaceProfile],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.css',
})
export class WorkspaceSidebar {
  readonly items = input<readonly NavigationItem[]>(DEFAULT_NAV_ITEMS);
  readonly activeItem = input('Overview');
  readonly searchDisabled = input(true);
}
