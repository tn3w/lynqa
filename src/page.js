import { ASSET_BASE, SCRIPT } from "./config.js"
import { fetchChallenge, solve } from "./runtime.js"
import { track } from "./behavior.js"

const $ = (id) => document.getElementById(id)

async function asset(name) {
	return (await fetch(ASSET_BASE + name)).text()
}

function fill(html) {
	const d = document
	d.documentElement.lang = "en"
	d.head.insertAdjacentHTML(
		"beforeend",
		'<meta name=viewport content="width=device-width,initial-scale=1"><title>Verifying</title>',
	)
	d.body.innerHTML = html
	const host = d.querySelector(".host")
	if (host) host.textContent = location.host
}

function setResult(ok, msg) {
	const box = $("verify")
	if (box) {
		const ck = $("ck")
		if (ck) ck.className = "cb"
		box.className = "box " + (ok ? "on" : "err")
		const bx = $("bx")
		if (bx) bx.textContent = msg
		return
	}
	const w = $("w")
	if (!w) return
	w.className = "status " + (ok ? "ok" : "err")
	$("l").textContent = msg
}

async function preserve(token) {
	const redirect = SCRIPT.getAttribute("data-redirect")
	if (redirect) {
		const u = new URL(redirect, location.href)
		u.searchParams.set("lynq-captcha-response", token)
		location.assign(u)
		return
	}
	const cb = SCRIPT.getAttribute("data-callback-url") || location.href
	try {
		await fetch(cb, {
			method: "POST",
			headers: { "content-type": "application/json", "x-lynq-token": token },
			body: JSON.stringify({ "lynq-captcha-response": token }),
		})
	} catch {
		/* ignore */
	}
	location.reload()
}

function retryOnError() {
	const k = "lqfail"
	let n = 0
	try {
		n = +(sessionStorage.getItem(k) || 0)
	} catch {
		n = 99
	}
	if (n < 2) {
		try {
			sessionStorage.setItem(k, n + 1)
		} catch {
			/* ignore */
		}
		setTimeout(() => location.reload(), 1500)
	} else {
		try {
			sessionStorage.removeItem(k)
		} catch {
			/* ignore */
		}
		setResult(false, "Error")
	}
}

function render(v) {
	try {
		sessionStorage.removeItem("lqfail")
	} catch {
		/* ignore */
	}
	if (v && v.ok) {
		setResult(true, "Verified")
		preserve(v.token)
	} else setResult(false, "Verification failed")
}

export async function runPage(sitekey) {
	const [css, html] = await Promise.all([asset("page.css"), asset("page.html")])
	document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>")
	const start = Date.now()
	const finalize = track("verify")
	fill(html)

	const ch = await fetchChallenge(sitekey)
	const go = () => solve(ch, finalize()).then(render).catch(retryOnError)

	if (ch.fields.mode === "interactive") {
		$("h").textContent = "Verify you are human"
		$("slot").innerHTML =
			'<div class=box id=verify><span class=cb id=ck></span>' +
			'<span class=bl id=bx>I’m not a robot</span></div>'
		let busy = false
		$("verify").addEventListener("click", () => {
			if (busy) return
			busy = true
			$("ck").className = "cb go"
			go()
		})
	} else {
		setTimeout(go, Math.max(0, 900 - (Date.now() - start)))
	}
}
