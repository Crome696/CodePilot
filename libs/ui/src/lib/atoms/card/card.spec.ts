import { TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card', () => {
  it('renders its projected content inside a card section', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lib-card')).toBeTruthy();
  });
});
