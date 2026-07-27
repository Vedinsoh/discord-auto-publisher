'use client';

import { Toaster, type ToasterProps } from 'sonner';

function ToastProvider({ ...props }: ToasterProps) {
  return (
    <Toaster
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
          success: 'border-l-4! border-l-green-500! [&_[data-icon]]:text-green-400!',
          error: 'border-l-4! border-l-red-500! [&_[data-icon]]:text-red-400!',
          warning: 'border-l-4! border-l-amber-500! [&_[data-icon]]:text-amber-400!',
        },
      }}
      {...props}
    />
  );
}

export { ToastProvider };
