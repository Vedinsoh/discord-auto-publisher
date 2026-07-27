'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * App toaster, branded to match the marketing/dashboard design system:
 * slate glass card with a faint blue-tinted border + blue glow, and a
 * blue-gradient action button mirroring the site CTAs. Colours are overridden
 * on top of sonner's default layout via `classNames` (Tailwind v4 trailing-`!`
 * important) so its tested positioning/stacking stays intact.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'font-sans! rounded-xl! border! border-[rgba(120,150,255,.15)]! bg-slate-900/95! text-slate-100! shadow-xl! shadow-blue-500/10! backdrop-blur-md!',
          title: 'text-white! font-semibold!',
          description: 'text-slate-400!',
          actionButton:
            'rounded-lg! border-0! bg-linear-to-r! from-blue-500! to-blue-600! px-3! font-medium! text-white! shadow-md! shadow-blue-500/30! transition-all! hover:from-blue-600! hover:to-blue-700!',
          cancelButton:
            'rounded-lg! border! border-slate-700! bg-slate-800! text-slate-300! hover:bg-slate-700! hover:text-white!',
          closeButton:
            'border-[rgba(120,150,255,.15)]! bg-slate-800! text-slate-300! hover:text-white!',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
