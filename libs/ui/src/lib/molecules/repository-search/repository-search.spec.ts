import { TestBed } from '@angular/core/testing';
import { RepositorySearch } from './repository-search';

describe('RepositorySearch', () => {
  it('composes the input atom with a disabled repository placeholder', () => {
    const fixture = TestBed.createComponent(RepositorySearch);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.placeholder).toBe('Search repositories');
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });
});
