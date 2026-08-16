import { TestBed } from '@angular/core/testing';
import { FoundationPanel } from './foundation-panel';

describe('FoundationPanel', () => {
  it('renders its supplied section copy', () => {
    const fixture = TestBed.createComponent(FoundationPanel);
    fixture.componentRef.setInput('title', 'CodePilot');
    fixture.componentRef.setInput('description', 'A repository workspace.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'CodePilot',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'A repository workspace.',
    );
  });
});
