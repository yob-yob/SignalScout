import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
	class?: string;
	children?: Snippet;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T & { children?: Snippet; child?: Snippet };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildrenOrChild<T> = T & { children?: Snippet; child?: Snippet };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T & { children?: Snippet; child?: Snippet };
