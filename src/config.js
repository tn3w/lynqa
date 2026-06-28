const script =
	document.currentScript ||
	document.querySelector("script[data-lynqa-page]") ||
	document.querySelector('script[src*="lynqa"]')

const src = (script?.getAttribute("src") || "").split("?")[0].replace(/\/$/, "")

export const API = (
	window.LYNQA_API ||
	script?.getAttribute("data-api") ||
	"https://api.lynqa.tn3w.dev"
).replace(/\/$/, "")

export const ASSET_BASE = src + "/assets/"

export const SCRIPT = script
