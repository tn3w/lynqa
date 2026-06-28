const MAX = 800
const PMS = 25

export function track(verifyId) {
	const d = document
	const start = Date.now()
	const now = () => Math.round(performance.now())
	const r3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000)
	const push = (a, v) => {
		if (a.length < MAX) a.push(v)
	}

	const S = {
		meta: {
			ua: navigator.userAgent,
			platform: navigator.platform,
			language: navigator.language,
			touch: matchMedia("(pointer: coarse)").matches || "ontouchstart" in window,
			cores: navigator.hardwareConcurrency || 0,
			screen: { w: screen.width, h: screen.height, dpr: devicePixelRatio || 1 },
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			startedAt: start,
			submittedAt: 0,
			capture: "browser",
		},
		pointer: [],
		clicks: [],
		keys: [],
		scroll: [],
		touch: [],
		motion: [],
		gyro: [],
		orientation: [],
		events: [],
		engagement: { visibleMs: 0, hiddenMs: 0, focusChanges: 0, idleMs: 0, totalMs: 0 },
	}

	let idle = 0
	let lastA = 0
	let lastV = Date.now()
	let lastP = 0
	let lastS = 0

	addEventListener(
		"pointermove",
		(e) => {
			const t = now()
			if (t - lastP < PMS) return
			lastP = t
			push(S.pointer, { t, x: Math.round(e.clientX), y: Math.round(e.clientY) })
		},
		{ passive: true },
	)
	addEventListener("pointerdown", () => push(S.events, { t: now(), name: "pointerdown" }), {
		passive: true,
	})
	addEventListener(
		"click",
		(e) => {
			const b = d.getElementById(verifyId)
			let ib = false
			if (b) {
				const r = b.getBoundingClientRect()
				ib = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
			}
			push(S.clicks, { t: now(), x: Math.round(e.clientX), y: Math.round(e.clientY), inBounds: ib })
			push(S.events, { t: now(), name: "click" })
		},
		{ capture: true },
	)

	const held = new Map()
	let kseq = 0
	addEventListener("keydown", (e) => {
		if (held.has(e.code)) return
		const id = ++kseq
		held.set(e.code, id)
		push(S.keys, { t: now(), type: "down", id })
	})
	addEventListener("keyup", (e) => {
		const id = held.get(e.code)
		if (id == null) return
		push(S.keys, { t: now(), type: "up", id })
		held.delete(e.code)
	})

	addEventListener(
		"scroll",
		() => {
			const t = now()
			if (t - lastS < PMS) return
			lastS = t
			push(S.scroll, { t, y: Math.round(scrollY) })
		},
		{ passive: true },
	)
	;["touchstart", "touchmove", "touchend"].forEach((tp) =>
		addEventListener(
			tp,
			(e) => {
				const c = e.changedTouches[0]
				if (!c) return
				push(S.touch, { t: now(), type: tp, x: Math.round(c.clientX), y: Math.round(c.clientY) })
			},
			{ passive: true },
		),
	)

	if (
		typeof DeviceMotionEvent === "undefined" ||
		typeof DeviceMotionEvent.requestPermission !== "function"
	) {
		addEventListener("devicemotion", (e) => {
			const a = e.accelerationIncludingGravity
			const g = e.rotationRate
			if (a) push(S.motion, { t: now(), ax: r3(a.x), ay: r3(a.y), az: r3(a.z) })
			if (g) push(S.gyro, { t: now(), alpha: r3(g.alpha), beta: r3(g.beta), gamma: r3(g.gamma) })
		})
		addEventListener("deviceorientation", (e) =>
			push(S.orientation, { t: now(), alpha: r3(e.alpha), beta: r3(e.beta), gamma: r3(e.gamma) }),
		)
	}
	;["pointermove", "keydown", "scroll", "touchstart"].forEach((tp) =>
		addEventListener(
			tp,
			() => {
				const gap = now() - lastA
				if (gap > 1500) idle += gap
				lastA = now()
			},
			{ passive: true },
		),
	)
	d.addEventListener("visibilitychange", () => {
		const sp = Date.now() - lastV
		if (d.hidden) S.engagement.visibleMs += sp
		else S.engagement.hiddenMs += sp
		lastV = Date.now()
		S.engagement.focusChanges++
		push(S.events, { t: now(), name: d.hidden ? "hidden" : "visible" })
	})

	return function finalize() {
		S.engagement.visibleMs += Date.now() - lastV
		S.engagement.idleMs = idle
		S.engagement.totalMs = Date.now() - start
		S.meta.submittedAt = Date.now()
		return JSON.stringify(S)
	}
}
