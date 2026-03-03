import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M+`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K+`;
  }
  return num.toLocaleString('en-US');
}

export function formatNumberFull(num: number): string {
  return `${num.toLocaleString('en-US')}+`;
}
