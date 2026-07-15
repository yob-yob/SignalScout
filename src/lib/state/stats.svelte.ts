export const stats = $state({
	sessionApiCalls: 0,
	sessionCacheHits: 0,
});

export function recordApiCall() {
	stats.sessionApiCalls++;
}

export function recordCacheHit() {
	stats.sessionCacheHits++;
}

export function getRemainingBudget(): number {
	return Math.max(0, 10000 - stats.sessionApiCalls);
}

export function getBudgetTier(): 'good' | 'warn' | 'low' {
	const remaining = getRemainingBudget();
	if (remaining > 5000) return 'good';
	if (remaining > 1000) return 'warn';
	return 'low';
}
