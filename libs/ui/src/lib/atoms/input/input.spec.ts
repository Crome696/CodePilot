import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Input } from './input';

@Component({
  imports: [Input],
  template: `
    <lib-input placeholder="Search repositories" [disabled]="true">
      <span leading-icon>Search</span>
    </lib-input>
  `,
})
class InputHost {}

describe('Input', () => {
  it('renders its placeholder, disabled state, and leading slot', () => {
    const fixture = TestBed.createComponent(InputHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.placeholder).toBe('Search repositories');
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Search');
  });
});
