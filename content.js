function getAnchorFromEvent(event) {
	const path = typeof event.composedPath === "function" ? event.composedPath() : [];
	for (const element of path) {
		if (element instanceof HTMLAnchorElement) {
			return element;
		}
	}

	const target = event.target;
	if (target instanceof Element) {
		const anchor = target.closest("a[href]");
		if (anchor) {
			return anchor;
		}
	}

	return null;
}

function shouldTrackClick(event, anchor) {
	if (!anchor || !anchor.href) {
		return false;
	}

	if (anchor.href.startsWith("javascript:")) {
		return false;
	}

	if (event.defaultPrevented) {
		return false;
	}

	return true;
}

document.addEventListener(
	"click",
	(event) => {
		const anchor = getAnchorFromEvent(event);
		if (!shouldTrackClick(event, anchor)) {
			return;
		}

		chrome.runtime.sendMessage({
			type: "LINK_CLICKED",
			url: anchor.href,
			title: anchor.textContent?.trim() || anchor.getAttribute("aria-label") || "Link",
			target: anchor.getAttribute("target") || "",
			button: event.button,
			modifierKeys: {
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				shiftKey: event.shiftKey,
				altKey: event.altKey
			}
		});
	},
	true
);