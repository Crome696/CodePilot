import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders the CodePilot foundation shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('CodePilot');
    expect(compiled.querySelectorAll('lib-nav-item')).toHaveLength(8);
    expect(compiled.textContent).not.toContain('Welcome');
    expect(compiled.textContent).not.toContain('ForgePilot AI');
  });
});
