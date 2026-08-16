import { TestBed } from '@angular/core/testing';
import { CardSection } from './card-section';

describe('CardSection', () => {
  it('renders the section wrapper', () => {
    const fixture = TestBed.createComponent(CardSection);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.lib-card-section'),
    ).toBeTruthy();
  });
});
