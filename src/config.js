const script =
	document.currentScript ||
	document.querySelector("script[data-lynq-page]") ||
	document.querySelector('script[src*="lynq"]')

const src = (script?.getAttribute("src") || "").split("?")[0].replace(/\/$/, "")

export const API = (
	window.LYNQ_API ||
	script?.getAttribute("data-api") ||
	"https://api.lynq.tn3w.dev"
).replace(/\/$/, "")

export const ASSET_BASE = src + "/assets/"

export const SCRIPT = script
