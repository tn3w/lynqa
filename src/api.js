import { SCRIPT } from "./config.js"
import { render } from "./widget.js"
import { runPage } from "./page.js"

function auto() {
	document.querySelectorAll(".lynqa-captcha[data-sitekey]").forEach((el) => render(el))
}

window.lynqa = {
	render: (el, opts) => render(typeof el === "string" ? document.querySelector(el) : el, opts || {}),
	ready: (cb) => cb(),
}

function boot() {
	const pageKey = SCRIPT && SCRIPT.getAttribute("data-sitekey")
	if (pageKey) return runPage(pageKey)
	auto()
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot)
else boot()
