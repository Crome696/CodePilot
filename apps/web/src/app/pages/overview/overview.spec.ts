import { TestBed } from '@angular/core/testing';
import { OverviewPage } from './overview';

describe('OverviewPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewPage],
    }).compileComponents();
  });

  it('composes the overview page from the dashboard template and UI layers', async () => {
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('lib-dashboard-shell')).toBeTruthy();
    expect(compiled.querySelector('lib-workspace-sidebar')).toBeTruthy();
    expect(compiled.querySelector('lib-workspace-header')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('CodePilot');
  });
});
