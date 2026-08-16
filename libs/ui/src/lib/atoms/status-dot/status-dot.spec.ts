import { TestBed } from '@angular/core/testing';
import { Status, StatusDot } from './status-dot';

describe('StatusDot', () => {
  it.each<Status>(['success', 'warning', 'error', 'muted'])(
    'renders the %s status',
    (status) => {
      const fixture = TestBed.createComponent(StatusDot);
      fixture.componentRef.setInput('status', status);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.lib-status__dot')?.classList,
      ).toContain(`lib-status__dot--${status}`);
    },
  );
});
