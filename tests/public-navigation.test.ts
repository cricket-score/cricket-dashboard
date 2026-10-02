import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ pathname: '/live/' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('../src/components/match-provider', () => ({
  useMatch: () => ({ connected: true, local: false, record: null }),
}));
import { Shell } from '../src/components/shell';

describe('parent-facing navigation', () => {
  it.each(['/', '/live', '/live/'])('shows only live match navigation at %s', pathname => {
    route.pathname = pathname;
    const html = renderToStaticMarkup(createElement(Shell, null, 'Match score'));
    expect(html).toContain('href="/live"');
    expect(html).not.toContain('href="/setup"');
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain('Scorer access');
  });
  it.each(['/admin/', '/setup/'])('retains organizer navigation in %s', pathname => {
    route.pathname = pathname;
    const html = renderToStaticMarkup(createElement(Shell, null, 'Protected content'));
    expect(html).toContain('href="/setup"');
    expect(html).toContain('href="/admin"');
  });
});
