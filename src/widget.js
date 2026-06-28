import { ASSET_BASE } from "./config.js"
import { fetchChallenge, solve } from "./runtime.js"
import { track } from "./behavior.js"

let cssDone = false
let counter = 0

async function injectCss() {
	if (cssDone) return
	cssDone = true
	const css = await (await fetch(ASSET_BASE + "widget.css")).text()
	document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>")
}

function resolveFn(opt, el, attr) {
	if (typeof opt === "function") return opt
	const name = el.getAttribute(attr)
	return name && typeof window[name] === "function" ? window[name] : null
}

export async function render(el, opts = {}) {
	if (!el || el.dataset.lqRendered) return
	el.dataset.lqRendered = "1"
	const sitekey = opts.sitekey || el.getAttribute("data-sitekey")
	if (!sitekey) return
	await injectCss()

	const id = "lq" + ++counter
	el.classList.add("lynq-widget")
	el.innerHTML =
		'<div class=lq-box id="' + id + '"><span class=lq-cb></span><span class=lq-bl>Verifying…</span></div>'
	const input = document.createElement("input")
	input.type = "hidden"
	input.name = opts.responseField || el.getAttribute("data-response-field") || "lynq-captcha-response"
	el.appendChild(input)

	const cb = resolveFn(opts.callback, el, "data-callback")
	const errCb = resolveFn(opts["error-callback"], el, "data-error-callback")
	const finalize = track(id)
	const box = () => document.getElementById(id)

	const onResult = (v) => {
		const b = box()
		if (!b) return
		if (v && v.ok) {
			b.className = "lq-box ok"
			b.querySelector(".lq-bl").textContent = "Verified"
			input.value = v.token
			if (cb) cb(v.token)
		} else {
			b.className = "lq-box err"
			b.querySelector(".lq-bl").textContent = "Failed"
			if (errCb) errCb()
		}
	}

	const ch = await fetchChallenge(sitekey, {
		action: opts.action || el.getAttribute("data-action"),
		cdata: opts.cdata || el.getAttribute("data-cdata"),
	})
	const go = () => solve(ch, finalize()).then(onResult).catch(() => onResult({ ok: false }))

	if (ch.fields.mode === "interactive") {
		const b = box()
		b.querySelector(".lq-bl").textContent = "I’m not a robot"
		b.classList.add("lq-click")
		let busy = false
		b.addEventListener("click", () => {
			if (busy) return
			busy = true
			b.classList.add("lq-go")
			go()
		})
	} else {
		go()
	}
	return id
}
