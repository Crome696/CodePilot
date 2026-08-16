import { TestBed } from '@angular/core/testing';
import { WorkspaceSidebar } from './workspace-sidebar';

describe('WorkspaceSidebar', () => {
  it('renders the default navigation section and active item', () => {
    const fixture = TestBed.createComponent(WorkspaceSidebar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('lib-nav-item')).toHaveLength(
      8,
    );
    expect(
      fixture.nativeElement
        .querySelector('lib-nav-item button')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    expect(
      fixture.nativeElement.querySelector('lib-repository-search'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('lib-workspace-profile'),
    ).toBeTruthy();
  });
});
