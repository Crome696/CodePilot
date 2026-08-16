import { TestBed } from '@angular/core/testing';
import { WorkspaceProfile } from './workspace-profile';

describe('WorkspaceProfile', () => {
  it('composes an avatar with workspace metadata', () => {
    const fixture = TestBed.createComponent(WorkspaceProfile);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lib-avatar')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('CodePilot workspace');
    expect(fixture.nativeElement.textContent).toContain('Static foundation');
  });
});
