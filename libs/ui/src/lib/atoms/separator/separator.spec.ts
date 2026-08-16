import { TestBed } from '@angular/core/testing';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders a horizontal separator', () => {
    const fixture = TestBed.createComponent(Separator);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lib-separator')).toBeTruthy();
  });
});
