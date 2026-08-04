import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

/**
 * Global component map for every .mdx file. Kept deliberately thin: the legal
 * route group wraps its content in `prose prose-invert`, so typographic styling
 * comes from @tailwindcss/typography rather than per-element overrides here.
 *
 * Only elements needing behaviour rather than styling are overridden.
 */
const components: MDXComponents = {
  // MDX emits a plain <a> for every link. Internal ones must go through next/link
  // or a cross-reference between two legal documents costs a full page load.
  a: ({ href, children, ...props }) => {
    const target = typeof href === 'string' ? href : '';
    const isInternal = target.startsWith('/') || target.startsWith('#');

    if (isInternal) {
      return (
        <Link href={target} {...props}>
          {children}
        </Link>
      );
    }

    // rel=noreferrer matters here specifically: several of these point at
    // regulators and payment providers, and the referrer would leak which
    // legal page the reader came from.
    return (
      <a href={target} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
