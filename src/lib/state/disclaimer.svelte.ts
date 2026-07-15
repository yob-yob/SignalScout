import { hasAcceptedDisclaimer } from '$lib/components/ApiDisclaimerModal.svelte';

let _checked = false;

export const disclaimer = $state({
	visible: false,
});

export function checkDisclaimer() {
	if (_checked) return;
	_checked = true;
	if (!hasAcceptedDisclaimer()) {
		disclaimer.visible = true;
	}
}

export function dismissDisclaimer() {
	disclaimer.visible = false;
	try {
		localStorage.setItem('signalscout_api_disclaimer_v1', '1');
	} catch {/* ignore */}
}
