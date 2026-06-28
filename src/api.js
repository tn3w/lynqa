import { SCRIPT } from "./config.js"
import { render } from "./widget.js"
import { runPage } from "./page.js"

function auto() {
	document.querySelectorAll(".lynq-captcha[data-sitekey]").forEach((el) => render(el))
}

window.lynq = {
	render: (el, opts) => render(typeof el === "string" ? document.querySelector(el) : el, opts || {}),
	ready: (cb) => cb(),
}

function boot() {
	const pageKey = SCRIPT && SCRIPT.getAttribute("data-sitekey")
	if (SCRIPT && SCRIPT.hasAttribute("data-lynq-page") && pageKey) return runPage(pageKey)
	auto()
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot)
else boot()
