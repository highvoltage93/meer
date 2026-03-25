import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMeetingCode(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 9)
    .replace(/(.{3})/g, '$1-')
    .replace(/-$/, '');
}

export function createMeetingCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const makeChunk = () =>
    Array.from({ length: 3 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');

  return `${makeChunk()}-${makeChunk()}-${makeChunk()}`;
}

export function toParticipantInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
