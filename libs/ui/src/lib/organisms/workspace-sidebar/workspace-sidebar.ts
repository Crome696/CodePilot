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
  readonly id: string;
  readonly label: string;
  readonly icon: NavigationIcon;
}

export const DEFAULT_NAV_ITEMS: readonly NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'repositories', label: 'Repositories', icon: 'repositories' },
  { id: 'issues', label: 'Issues', icon: 'issues' },
  { id: 'pull-requests', label: 'Pull Requests', icon: 'pull-requests' },
  { id: 'commits', label: 'Commits', icon: 'commits' },
  { id: 'branches', label: 'Branches', icon: 'branches' },
  { id: 'validation', label: 'Validation', icon: 'validation' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
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
