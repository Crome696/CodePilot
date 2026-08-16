import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Avatar,
  AvatarSize,
  Badge,
  BadgeVariant,
  Button,
  ButtonSize,
  ButtonVariant,
  Card,
  CardSection,
  Input,
  NavItem,
  Separator,
  Status,
  StatusDot,
} from './ui';

@Component({
  imports: [Input],
  template: `
    <lib-input placeholder="Search repositories" [disabled]="true">
      <span leading-icon>Search</span>
    </lib-input>
  `,
})
class InputHost {}

describe('UI primitives', () => {
  it.each<ButtonVariant>([
    'primary',
    'secondary',
    'danger',
    'ghost',
    'outline',
    'success',
    'violet',
  ])('renders the %s button variant', (variant) => {
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

  it.each<BadgeVariant>([
    'default',
    'success',
    'warning',
    'error',
    'outline',
    'blue',
    'violet',
  ])('renders the %s badge variant', (variant) => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span')?.classList).toContain(
      `lib-badge--${variant}`,
    );
  });

  it('renders an input with a leading icon slot', () => {
    const fixture = TestBed.createComponent(InputHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.placeholder).toBe('Search repositories');
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Search');
  });

  it.each<AvatarSize>(['sm', 'md', 'lg'])(
    'renders the %s avatar fallback',
    (size) => {
      const fixture = TestBed.createComponent(Avatar);
      fixture.componentRef.setInput('initials', 'CP');
      fixture.componentRef.setInput('size', size);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('CP');
      expect(fixture.nativeElement.querySelector('span')?.classList).toContain(
        `lib-avatar--${size}`,
      );
    },
  );

  it('renders an avatar image when a source is supplied', () => {
    const fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('src', '/avatar.png');
    fixture.componentRef.setInput('alt', 'CodePilot');
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector(
      'img',
    ) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/avatar.png');
    expect(image.alt).toBe('CodePilot');
  });

  it.each<Status>(['success', 'warning', 'error', 'muted'])(
    'renders the %s status dot',
    (status) => {
      const fixture = TestBed.createComponent(StatusDot);
      fixture.componentRef.setInput('status', status);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.lib-status__dot')?.classList,
      ).toContain(`lib-status__dot--${status}`);
    },
  );

  it('renders the card, card section, separator, and active navigation item', () => {
    const card = TestBed.createComponent(Card);
    const cardSection = TestBed.createComponent(CardSection);
    const separator = TestBed.createComponent(Separator);
    const navigation = TestBed.createComponent(NavItem);
    navigation.componentRef.setInput('label', 'Overview');
    navigation.componentRef.setInput('active', true);

    card.detectChanges();
    cardSection.detectChanges();
    separator.detectChanges();
    navigation.detectChanges();

    expect(card.nativeElement.querySelector('.lib-card')).toBeTruthy();
    expect(
      cardSection.nativeElement.querySelector('.lib-card-section'),
    ).toBeTruthy();
    expect(
      separator.nativeElement.querySelector('.lib-separator'),
    ).toBeTruthy();
    expect(
      navigation.nativeElement
        .querySelector('button')
        ?.getAttribute('aria-current'),
    ).toBe('page');
  });
});
