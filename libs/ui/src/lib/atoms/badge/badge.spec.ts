import { TestBed } from '@angular/core/testing';
import { Badge, BadgeVariant } from './badge';

describe('Badge', () => {
  it.each<BadgeVariant>([
    'default',
    'success',
    'warning',
    'error',
    'outline',
    'blue',
    'violet',
  ])('renders the %s variant', (variant) => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span')?.classList).toContain(
      `lib-badge--${variant}`,
    );
  });
});
