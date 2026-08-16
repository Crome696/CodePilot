import { Component, input } from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'violet';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

@Component({
  selector: 'lib-button',
  standalone: true,
  template: `
    <button
      class="lib-button"
      [class]="'lib-button lib-button--' + variant() + ' lib-button--' + size()"
      [disabled]="disabled()"
      [attr.type]="type()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .lib-button {
      align-items: center;
      background: var(--color-primary);
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--color-background);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 600;
      gap: 0.5rem;
      justify-content: center;
      line-height: 1.25;
      min-height: 2.25rem;
      padding: 0.5rem 0.875rem;
      transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease;
    }
    .lib-button:hover:not(:disabled) {
      background: var(--color-accent-blue);
    }
    .lib-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .lib-button--secondary {
      background: var(--color-secondary);
      color: var(--color-foreground);
    }
    .lib-button--danger {
      background: var(--color-error);
      color: var(--color-foreground);
    }
    .lib-button--ghost {
      background: transparent;
      color: var(--color-secondary-foreground);
    }
    .lib-button--ghost:hover:not(:disabled) {
      background: var(--color-secondary);
      color: var(--color-foreground);
    }
    .lib-button--outline {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-secondary-foreground);
    }
    .lib-button--outline:hover:not(:disabled) {
      background: var(--color-secondary);
      color: var(--color-foreground);
    }
    .lib-button--success {
      background: var(--color-success);
      color: var(--color-foreground);
    }
    .lib-button--violet {
      background: var(--color-accent-violet);
      color: var(--color-foreground);
    }
    .lib-button--sm {
      min-height: 1.875rem;
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
    }
    .lib-button--lg {
      min-height: 2.75rem;
      padding: 0.75rem 1.125rem;
      font-size: 1rem;
    }
    .lib-button--icon {
      min-height: 2.25rem;
      padding: 0.5rem;
      width: 2.25rem;
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'outline'
  | 'blue'
  | 'violet';

@Component({
  selector: 'lib-badge',
  standalone: true,
  template: `<span
    class="lib-badge"
    [class]="'lib-badge lib-badge--' + variant()"
    ><ng-content
  /></span>`,
  styles: `
    :host {
      display: inline-flex;
    }
    .lib-badge {
      align-items: center;
      background: var(--color-secondary);
      border: 1px solid transparent;
      border-radius: 999px;
      color: var(--color-secondary-foreground);
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
      padding: 0.3125rem 0.5rem;
    }
    .lib-badge--success {
      background: var(--color-success);
      color: var(--color-foreground);
    }
    .lib-badge--warning {
      background: var(--color-warning);
      color: var(--color-background);
    }
    .lib-badge--error {
      background: var(--color-error);
      color: var(--color-foreground);
    }
    .lib-badge--outline {
      background: transparent;
      border-color: var(--color-border);
    }
    .lib-badge--blue {
      background: var(--color-accent-blue);
      color: var(--color-foreground);
    }
    .lib-badge--violet {
      background: var(--color-accent-violet);
      color: var(--color-foreground);
    }
  `,
})
export class Badge {
  readonly variant = input<BadgeVariant>('default');
}

@Component({
  selector: 'lib-card',
  standalone: true,
  template: `<section class="lib-card"><ng-content /></section>`,
  styles: `
    :host {
      display: block;
    }
    .lib-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      color: var(--color-foreground);
    }
  `,
})
export class Card {}

@Component({
  selector: 'lib-card-section',
  standalone: true,
  template: `<div class="lib-card-section"><ng-content /></div>`,
  styles: `
    :host {
      display: block;
    }
    .lib-card-section {
      padding: 1rem;
    }
    :host + :host .lib-card-section {
      border-top: 1px solid var(--color-border);
    }
  `,
})
export class CardSection {}

@Component({
  selector: 'lib-input',
  standalone: true,
  template: `
    <label class="lib-input">
      <span class="lib-input__leading"
        ><ng-content select="[leading-icon]"
      /></span>
      <input
        [attr.type]="type()"
        [attr.placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
      />
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    .lib-input {
      align-items: center;
      background: var(--color-secondary);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-secondary-foreground);
      display: flex;
      gap: 0.5rem;
      min-height: 2.25rem;
      padding: 0 0.75rem;
    }
    .lib-input:focus-within {
      border-color: var(--color-ring);
    }
    .lib-input__leading {
      align-items: center;
      display: inline-flex;
      flex: 0 0 auto;
    }
    .lib-input__leading:empty {
      display: none;
    }
    input {
      background: transparent;
      border: 0;
      color: var(--color-foreground);
      font: inherit;
      min-width: 0;
      outline: 0;
      padding: 0.5rem 0;
      width: 100%;
    }
    input::placeholder {
      color: var(--color-muted);
    }
    input:disabled {
      cursor: not-allowed;
    }
  `,
})
export class Input {
  readonly type = input('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly disabled = input(false);
}

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-avatar',
  standalone: true,
  template: `
    <span class="lib-avatar" [class]="'lib-avatar lib-avatar--' + size()">
      @if (src()) {
        <img [src]="src()" [alt]="alt()" />
      } @else {
        <span aria-hidden="true">{{ initials() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .lib-avatar {
      align-items: center;
      background: var(--color-secondary);
      border: 1px solid var(--color-border);
      border-radius: 50%;
      color: var(--color-foreground);
      display: inline-flex;
      flex: 0 0 auto;
      font-size: 0.75rem;
      font-weight: 700;
      justify-content: center;
      overflow: hidden;
    }
    .lib-avatar--sm {
      height: 1.75rem;
      width: 1.75rem;
    }
    .lib-avatar--md {
      height: 2.25rem;
      width: 2.25rem;
    }
    .lib-avatar--lg {
      height: 3rem;
      width: 3rem;
    }
    img {
      height: 100%;
      object-fit: cover;
      width: 100%;
    }
  `,
})
export class Avatar {
  readonly src = input('');
  readonly alt = input('');
  readonly initials = input('');
  readonly size = input<AvatarSize>('md');
}

export type Status = 'success' | 'warning' | 'error' | 'muted';

@Component({
  selector: 'lib-status-dot',
  standalone: true,
  template: `
    <span class="lib-status" [attr.aria-label]="label()" role="status">
      <span
        class="lib-status__dot"
        [class]="'lib-status__dot lib-status__dot--' + status()"
        aria-hidden="true"
      ></span>
      <span class="lib-status__label">{{ label() }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .lib-status {
      align-items: center;
      color: var(--color-muted);
      display: inline-flex;
      font-size: 0.8125rem;
      gap: 0.5rem;
    }
    .lib-status__dot {
      background: var(--color-muted);
      border-radius: 50%;
      display: inline-block;
      height: 0.5rem;
      width: 0.5rem;
    }
    .lib-status__dot--success {
      background: var(--color-success);
    }
    .lib-status__dot--warning {
      background: var(--color-warning);
    }
    .lib-status__dot--error {
      background: var(--color-error);
    }
    .lib-status__dot--muted {
      background: var(--color-muted);
    }
  `,
})
export class StatusDot {
  readonly status = input<Status>('muted');
  readonly label = input('Status');
}

@Component({
  selector: 'lib-separator',
  standalone: true,
  template: `<hr class="lib-separator" />`,
  styles: `
    :host {
      display: block;
    }
    .lib-separator {
      border: 0;
      border-top: 1px solid var(--color-border);
      margin: 0;
    }
  `,
})
export class Separator {}

@Component({
  selector: 'lib-nav-item',
  standalone: true,
  template: `
    <button
      class="lib-nav-item"
      [class.lib-nav-item--active]="active()"
      [disabled]="disabled()"
      type="button"
      [attr.aria-current]="active() ? 'page' : null"
    >
      <span class="lib-nav-item__icon" aria-hidden="true"
        ><ng-content select="[nav-icon]"
      /></span>
      <span>{{ label() }}</span>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .lib-nav-item {
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--color-muted);
      cursor: pointer;
      display: flex;
      font: inherit;
      gap: 0.75rem;
      min-height: 2.5rem;
      padding: 0.5rem 0.75rem;
      text-align: left;
      width: 100%;
    }
    .lib-nav-item:hover:not(:disabled) {
      background: var(--color-secondary);
      color: var(--color-foreground);
    }
    .lib-nav-item--active {
      background: var(--color-secondary);
      color: var(--color-foreground);
    }
    .lib-nav-item:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .lib-nav-item__icon {
      display: inline-flex;
      flex: 0 0 auto;
    }
    .lib-nav-item__icon:empty {
      display: none;
    }
  `,
})
export class NavItem {
  readonly label = input.required<string>();
  readonly active = input(false);
  readonly disabled = input(false);
}
