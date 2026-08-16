import { TestBed } from '@angular/core/testing';
import { NavItem } from './nav-item';

describe('NavItem', () => {
  it('marks the active navigation item as the current page', () => {
    const fixture = TestBed.createComponent(NavItem);
    fixture.componentRef.setInput('label', 'Overview');
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('button')
        ?.getAttribute('aria-current'),
    ).toBe('page');
  });
});
