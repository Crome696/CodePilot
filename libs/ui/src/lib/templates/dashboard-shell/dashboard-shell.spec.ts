import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardShell } from './dashboard-shell';

@Component({
  imports: [DashboardShell],
  template: `
    <lib-dashboard-shell>
      <div dashboard-sidebar>Sidebar</div>
      <div dashboard-header>Header</div>
      <div dashboard-content>Content</div>
    </lib-dashboard-shell>
  `,
})
class DashboardShellHost {}

describe('DashboardShell', () => {
  it('keeps sidebar, header, and content projection regions stable', () => {
    const fixture = TestBed.createComponent(DashboardShellHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.app-shell__sidebar').textContent,
    ).toContain('Sidebar');
    expect(
      fixture.nativeElement.querySelector('.app-shell__workspace').textContent,
    ).toContain('Header');
    expect(
      fixture.nativeElement.querySelector('.app-shell__content').textContent,
    ).toContain('Content');
  });
});
