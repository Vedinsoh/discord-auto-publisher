import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Image
      src="/auto-publisher.png"
      alt="Auto Publisher"
      width={32}
      height={32}
      className={cn(
        'rounded-[10px] shadow-[0_4px_14px_-4px_rgba(47,107,255,.6),0_0_0_1px_rgba(120,150,255,.18)]',
        className
      )}
    />
  );
}
