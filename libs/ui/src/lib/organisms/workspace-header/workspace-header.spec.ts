import { TestBed } from '@angular/core/testing';
import { WorkspaceHeader } from './workspace-header';

describe('WorkspaceHeader', () => {
  it('renders the repository context and status label', () => {
    const fixture = TestBed.createComponent(WorkspaceHeader);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'repository / context pending',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'System checks pending',
    );
    expect(fixture.nativeElement.querySelector('lib-status-dot')).toBeTruthy();
  });
});
