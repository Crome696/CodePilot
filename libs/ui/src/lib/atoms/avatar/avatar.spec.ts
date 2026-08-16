import { TestBed } from '@angular/core/testing';
import { Avatar, AvatarSize } from './avatar';

describe('Avatar', () => {
  it.each<AvatarSize>(['sm', 'md', 'lg'])(
    'renders the %s initials fallback',
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

  it('renders an image when a source is supplied', () => {
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
});
