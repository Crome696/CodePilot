import { TestBed } from '@angular/core/testing';
import { Button, ButtonSize, ButtonVariant } from './button';

describe('Button', () => {
  it.each<ButtonVariant>([
    'primary',
    'secondary',
    'danger',
    'ghost',
    'outline',
    'success',
    'violet',
  ])('renders the %s variant', (variant) => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('variant', variant);
    fixture.componentRef.setInput('size', 'lg' satisfies ButtonSize);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button.classList).toContain(`lib-button--${variant}`);
    expect(button.classList).toContain('lib-button--lg');
  });
});
