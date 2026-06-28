import { API } from "./config.js"

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64(s) {
	const bin = atob(s)
	const out = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
	return out
}

export async function fetchChallenge(sitekey, opts = {}) {
	const res = await fetch(API + "/challenge", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sitekey, action: opts.action, cdata: opts.cdata }),
	})
	const ch = await res.json()
	if (!ch || !ch.chal) throw new Error("challenge failed")
	ch.fields = JSON.parse("{" + ch.chal + "}")
	return ch
}

export async function solve(ch, behaviorJson) {
	const f = ch.fields
	globalThis.__lq = { nonce: f.nonce, exp: f.exp, signature: f.signature }

	const wasm = b64(ch.vm)
	let mem = null
	const host = (op, a, b, c, e) => {
		op = op >>> 0
		if (op === ch.ops.eval) {
			const src = dec.decode(new Uint8Array(mem.buffer, a, b))
			let result
			try {
				result = new Function(src)()
			} catch {
				return -1n
			}
			if (typeof result !== "string") return -1n
			const by = enc.encode(result)
			if (by.length > e) return -1n
			new Uint8Array(mem.buffer, c, by.length).set(by)
			return BigInt(by.length)
		}
		if (op === ch.ops.time) return BigInt(Math.floor(performance.now()))
		return -1n
	}
	const imp = {}
	imp[ch.import.module] = { [ch.import.name]: host }
	const inst = (await WebAssembly.instantiate(wasm, imp)).instance
	mem = inst.exports.memory
	const entry = inst.exports[ch.entry]

	const chal = enc.encode(ch.chal)
	const bb = enc.encode(behaviorJson)
	const frameLen = 4 + chal.length + 4 + bb.length + 4 + wasm.length + 4
	const inPtr = entry(ch.magic.alloc, frameLen, 0) >>> 0
	let o = inPtr
	const dv = new DataView(mem.buffer)
	dv.setUint32(o, chal.length, true)
	o += 4
	new Uint8Array(mem.buffer, o, chal.length).set(chal)
	o += chal.length
	dv.setUint32(o, bb.length, true)
	o += 4
	new Uint8Array(mem.buffer, o, bb.length).set(bb)
	o += bb.length
	dv.setUint32(o, wasm.length, true)
	o += 4
	new Uint8Array(mem.buffer, o, wasm.length).set(wasm)
	o += wasm.length
	dv.setUint32(o, f.pow_difficulty, true)

	const ret = entry(ch.magic.run, inPtr, frameLen) >>> 0
	const rv = new DataView(mem.buffer)
	const body = dec.decode(new Uint8Array(mem.buffer, ret + 4, rv.getUint32(ret, true)))
	return (
		await fetch(API + "/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body,
		})
	).json()
}
