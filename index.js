class Array2D {
	constructor(w, h, fill = 0) {
		this.w = w
		this.h = h
		this.arr = Array(this.w * this.h).fill(fill)
	}

	leni() {
		return this.w
	}

	lenj() {
		return this.h
	}

	valid(i, j) {
		return 0 <= i && i < this.leni() && 0 <= j && j < this.lenj()
	}

	get(i, j) {
		if (!this.valid(i, j)) return undefined
		return this.arr[i * this.lenj() + j]
	}

	set(i, j, v) {
		if (!this.valid(i, j)) return undefined
		this.arr[i * this.lenj() + j] = v
	}
}

/*
 * Game
 */

class Game {
	static VALUE_BITMASK = 0b001111
	static STATE_BITMASK = 0b110000
	static BOMB = 0b1111
	static EMPTY = 0
	static DIRS = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
		[0, 1],
		[1, -1],
		[1, 0],
		[1, 1]
	]
	static HIDDEN = 0
	static REVELED = 1
	static FLAG = 2

	static value(x) {
		return x & Game.VALUE_BITMASK
	}

	static state(x) {
		return (x & Game.STATE_BITMASK) >> 4
	}

	static compose(state, value) {
		return Game.value(value) | (Game.state(state << 4) << 4)
	}

	constructor(w, h) {
		this.map = new Array2D(w, h, Game.compose(Game.HIDDEN, Game.EMPTY))
	}

	leni() {
		return this.map.leni()
	}

	lenj() {
		return this.map.lenj()
	}

	getValue(i, j) {
		return Game.value(this.map.get(i, j))
	}

	getState(i, j) {
		return Game.state(this.map.get(i, j))
	}

	setValue(i, j, val) {
		this.map.set(i, j, Game.compose(this.getState(i, j), val))
	}

	setState(i, j, state) {
		this.map.set(i, j, Game.compose(state, this.getValue(i, j)))
	}

	propagateNumbers() {
		for (let i = 0; i < this.map.leni(); i++) {
			for (let j = 0; j < this.map.lenj(); j++) {
				// cannot propagate non-bombs
				if (this.getValue(i, j) !== Game.BOMB) continue

				for (let [di, dj] of Game.DIRS) {
					let ni = i + di
					let nj = j + dj
					if (!this.map.valid(ni, nj)) continue

					let val = this.getValue(ni, nj)
					if (val === Game.BOMB) continue
					this.setValue(ni, nj, val + 1)
				}
			}
		}
	}

	spawnBombs(prob) {
		for (let i = 0; i < this.map.leni(); i++) {
			for (let j = 0; j < this.map.lenj(); j++) {
				if (this.getState(i, j) === Game.HIDDEN && Math.random() <= prob) {
					this.setValue(i, j, Game.BOMB)
				}
			}
		}
		this.propagateNumbers()
	}

	/*
	 * @param (integer) propagate
	 *     0 => never propagate
	 * 	 1 => propagate if needed
	 * 	 2 => always propagate
	 */
	hit(i, j, propagate = 1) {
		if (!this.map.valid(i, j)) return

		let state = this.getState(i, j)
		if (propagate <= 1 && state === Game.REVELED) return
		this.setState(i, j, Game.REVELED)

		let value = this.getValue(i, j)
		if (value === Game.BOMB) console.log("boom")
		if (propagate === 0 || value != Game.EMPTY) return
		for (let [di, dj] of Game.DIRS) {
			this.hit(i + di, j + dj)
		}
	}

	flag(i, j) {
		let val = this.getState(i, j)
		if (val === Game.REVELED) return
		this.setState(i, j, val ^ Game.FLAG)
	}
}

/*
 * Sprites
*/

const SIZES = {
	hidden: {
		border: (cellSize) => 2 * cellSize / 15,
		face: (cellSize) => cellSize - 2 * SIZES.hidden.border(cellSize)
	},
	reveled: {
		font: (cellSize) => cellSize
	},
	flag: {
		padx: (cellSize) => Math.floor(SIZES.hidden.face(cellSize) / 6),
		pady: (cellSize) => Math.floor(SIZES.hidden.face(cellSize) / 8),
		poleWidth: (cellSize) => Math.floor(SIZES.hidden.face(cellSize) / 6),
		flagHeightFrac: 2/3
	},
	bomb: {
		diam: (cellSize) => SIZES.hidden.face(cellSize) * 0.75,
		spikeWidth: (cellSize) => Math.floor(SIZES.hidden.face(cellSize) / 10),
		spikeLen: (cellSize) => SIZES.bomb.spikeWidth(cellSize) * 1.5
	}
}

const COLORS = {
	hidden: {
		face: "#A0A0A0",
		bright: "#C1C1C1",
		dark: "#707070",
	},
	reveled: {
		background: "#A0A0A0",
		number: {
			1: "blue",
			2: "green",
			3: "red",
			4: "darkblue",
			5: "firebrick",
			6: "darkcyan",
			7: "black",
			8: "dimgray"
		}
	},
	bomb: {
		background: "red",
		bomb: "black"
	},
	flag: {
		pole: "black",
		flag: "red",
	}
}

function gen_blank_sprite(cellSize) {
	let sprite = document.createElement("canvas")
	sprite.width = cellSize
	sprite.height = cellSize
	let ctx = sprite.getContext('2d')
	return [sprite, ctx]
}

function gen_hidden_sprite(ctx, cellSize) {
	// let [sprite, ctx] = gen_blank_sprite(cellSize)
	// ctx.save()

	const colors = COLORS.hidden
	const sizes = SIZES.hidden

	const borderSize = sizes.border(cellSize)
	const faceSize = sizes.face(cellSize)
	// darker side
	ctx.fillStyle = colors.dark
	ctx.beginPath()
	ctx.moveTo(cellSize, cellSize)
	ctx.lineTo(0, cellSize)
	ctx.lineTo(cellSize, 0)
	ctx.fill()
	// light side
	ctx.fillStyle = colors.bright
	ctx.beginPath()
	ctx.moveTo(0, 0)
	ctx.lineTo(0, cellSize)
	ctx.lineTo(cellSize, 0)
	ctx.fill()
	// face
	ctx.fillStyle = colors.face
	ctx.fillRect(
		borderSize,
		borderSize,
		faceSize,
		faceSize
	)

	// ctx.restore()
	// return [sprite, ctx]
}

function gen_flag_sprite(ctx, cellSize) {
	// let [sprite, ctx] = gen_hidden_sprite(cellSize)
	// ctx.save()

	const colors = COLORS.flag
	const sizes = SIZES.flag
	const border = SIZES.hidden.border(cellSize)

	const padx = sizes.padx(cellSize) + border
	const pady = sizes.pady(cellSize) + border
	const flagHeight = cellSize - 2*pady

	ctx.fillStyle = colors.pole
	ctx.fillRect(padx, pady, sizes.poleWidth(cellSize), flagHeight)
	ctx.fillStyle = colors.flag
	ctx.beginPath()
	ctx.moveTo(padx + sizes.poleWidth(cellSize), pady);
	ctx.lineTo(cellSize - padx,  pady + Math.floor(0.5 * sizes.flagHeightFrac * flagHeight))
	ctx.lineTo(padx + sizes.poleWidth(cellSize), pady + Math.floor(sizes.flagHeightFrac * flagHeight))
	ctx.fill()

	// ctx.restore()
	// return [sprite, ctx]
}

function gen_reveled_sprite(ctx, cellSize, num) {
	// let [sprite, ctx] = gen_blank_sprite(cellSize)
	// ctx.save()

	const colors = COLORS.reveled
	const sizes = SIZES.reveled

	ctx.fillStyle = colors.background
	ctx.fillRect(0, 0, cellSize, cellSize)
	if (num != 0) {
		ctx.fillStyle = colors.number[num]
		ctx.font = `${sizes.font(cellSize)}px Robot-Crush`
		ctx.textBaseline = "middle"
		ctx.textAlign = "center"
		/*
		 * Simple 8 "rect"-display
		 */
		const pad = {
			x: cellSize * 0.2,
			y: cellSize * 0.2
		}
		const thickness = {
			w: cellSize * 0.2,
			h: cellSize * 0.125
		}

		const tl = { x: pad.x, y: pad.y }
		const br = { x: cellSize - pad.x, y: cellSize - pad.y }

		const font = {
			w: br.x - tl.x,
			h: br.y - tl.y,
		}

		const x1 = tl.x
		const x2 = Math.round((tl.x + br.x - thickness.w) / 2)
		const x3 = br.x - thickness.w
		const y1 = tl.y
		const y2 = Math.round((tl.y + br.y - thickness.h) / 2)
		const y3 = br.y - thickness.h
		const halfh = Math.round((font.h + thickness.h / 2) / 2)

		/*
		 * ||=0======|| 0 top horiz
		 * ||   ||   || 1 mid horiz
		 * 3|   7|   4| 2 bot horiz
		 * ||   ||   || 3 top left vert
		 * ||=1=||===|| 4 top right vert
		 * ||   ||   || 5 bot left vert
		 * 5|   ||   6| 6 bot right vert
		 * ||   ||   || 7 full mid vert
		 * ||=2=||===||
		 */

		const rects = [
			{x: x1, y: y1, w: font.w, h: thickness.h },
			{x: x1, y: y2, w: font.w, h: thickness.h },
			{x: x1, y: y3, w: font.w, h: thickness.h },
			{x: x1, y: y1, w: thickness.w, h: halfh},
			{x: x3, y: y1, w: thickness.w, h: halfh},
			{x: x1, y: y2, w: thickness.w, h: halfh},
			{x: x3, y: y2, w: thickness.w, h: halfh},
			{x: x2, y: y1, w: thickness.w, h: font.h},
		]

		const decoder = {
			1: [7],
			2: [0, 4, 1, 5, 2],
			3: [0, 1, 2, 4, 6],
			4: [3, 1, 4, 6],
			5: [0, 3, 1, 6, 2],
			6: [0, 3, 5, 2, 6, 1],
			7: [0, 4, 6],
			8: [0, 1, 2, 3, 4, 5, 6]
		}

		// ctx.fillText(num.toString(), Math.round(cellSize / 2), Math.round(cellSize / 2))

		for (let {x, y, w, h} of decoder[num].map(i => rects[i])) {
			ctx.fillRect(x, y, w, h)
		}

	}

	// ctx.restore()
	// return [sprite, ctx]
}

function gen_bomb_sprite(ctx, cellSize) {
	// let [sprite, ctx] = gen_blank_sprite(cellSize)
	// ctx.save()

	const colors = COLORS.bomb
	const sizes = SIZES.bomb

	const bombRad = sizes.diam(cellSize) / 2
	const spikeLen = sizes.spikeLen(cellSize)
	const spikeWidth = sizes.spikeWidth(cellSize)

	ctx.fillStyle = colors.background
	ctx.fillRect(0, 0, cellSize, cellSize)
	ctx.fillStyle = colors.bomb
	ctx.beginPath()
	ctx.arc(
		cellSize / 2,
		cellSize / 2,
		bombRad,
		0,
		2 * Math.PI
	);
	ctx.fill()
	ctx.fillRect(
		cellSize / 2 - bombRad - spikeLen,
		cellSize / 2 - spikeWidth / 2,
		2 * bombRad + 2 * spikeLen,
		spikeWidth,
	)
	ctx.fillRect(
		cellSize / 2 - spikeWidth / 2,
		cellSize / 2 - bombRad - spikeLen,
		spikeWidth,
		2 * bombRad + 2 * spikeLen,
	)

	// ctx.restore()
	// return [sprite, ctx]
}

class Renderer {
	constructor(cellSize) {
		this.cellSize = cellSize
		this.sprites = {
			hidden: (ctx) => gen_hidden_sprite(ctx, cellSize),
			flag: (ctx) => gen_flag_sprite(ctx, cellSize),
			bomb: (ctx) => gen_bomb_sprite(ctx, cellSize),
			reveled: Array.from({length: 9}, (_, i) => (ctx) => gen_reveled_sprite(ctx, cellSize, i))
		}
	}

	static lengthI(ctx) {
		return ctx.canvas.width
	}

	static lengthJ(ctx) {
		return ctx.canvas.height
	}

	gap(length) {
		return Math.floor((length % this.cellSize) / 2)
	}

	gapI(ctx) {
		return this.gap(Renderer.lengthI(ctx))
	}

	gapJ(ctx) {
		return this.gap(Renderer.lengthJ(ctx))
	}

	maxSize(length) {
		return Math.floor(length / this.cellSize) + 2
	}

	maxSizeI(ctx) {
		return this.maxSize(Renderer.lengthI(ctx))
	}

	maxSizeJ(ctx) {
		return this.maxSize(Renderer.lengthJ(ctx))
	}

	moveCursor(ctx, i, j, useGap = true) {
		if (useGap) {
			ctx.translate((i - 1) * this.cellSize + this.gapI(ctx), (j - 1) * this.cellSize + this.gapJ(ctx))
		} else {
			ctx.translate(i * this.cellSize, j * this.cellSize)
		}
	}

	renderCell(ctx, state, value) {
		let sprite
		switch (state) {
			case Game.HIDDEN:
				sprite = this.sprites.hidden
				break
			case Game.FLAG:
				sprite = this.sprites.flag
				break
			case Game.REVELED:
				if (value === Game.BOMB) {
					sprite = this.sprites.bomb
				} else {
					sprite = this.sprites.reveled[value]
				}
				break
		}

		// ctx.drawImage(sprite, 0, 0, this.cellSize, this.cellSize)
		sprite(ctx)
	}

	render(ctx, game) {
		for (let i = 0; i < game.leni(); i++) {
			for (let j = 0; j < game.lenj(); j++) {
				ctx.save()
				this.moveCursor(ctx, i, j)
				this.renderCell(ctx, game.getState(i, j), game.getValue(i, j))
				ctx.restore()
			}
		}
	}

	mapMouse(ctx, x, y) {
		return {
			i: Math.floor((x + this.cellSize - this.gapI(ctx)) / this.cellSize),
			j: Math.floor((y + this.cellSize - this.gapJ(ctx)) / this.cellSize),
		}
	}

	mapRect(ctx, rect, pad = 3) {
		let {x, y, width, height} = rect
		let {i: startI, j: startJ} = this.mapMouse(ctx, x, y)
		let {i: endI, j: endJ} = this.mapMouse(ctx, x + width, y + height)

		startI -= pad
		startJ -= pad
		endI += pad
		endJ += pad

		return {
			tlI: startI,
			tlJ: startJ,
			brI: endI,
			brJ: endJ,
		}
	}
}

let mainCanvas
let mainCtx
let game
let renderer

function initializeCanvas() {
	mainCanvas = document.createElement("canvas")
	document.body.appendChild(mainCanvas)
	mainCanvas.id = "main_canvas"
	mainCanvas.style.zIndex = -1
	mainCanvas.style.position = "absolute"
	mainCanvas.style.top = 0
	mainCanvas.style.left = 0
}

function restart() {
	if (mainCanvas === undefined) {
		initializeCanvas()
	}

	let content = document.getElementById("content")
	mainCanvas.width = content.offsetWidth
	mainCanvas.height = content.offsetHeight
	if (renderer === undefined) renderer = new Renderer(30)
	mainCtx = mainCanvas.getContext('2d')
	game = new Game(renderer.maxSizeI(mainCtx), renderer.maxSizeJ(mainCtx))

	let rects = contentRects()
	for (let r of rects) {
		uncoverOnRect(r)
	}
	game.spawnBombs(0.2)
	for (let r of rects) {
		propagateFromRect(r)
	}

	renderer.render(mainCtx, game)
}

function leafNodes(element, list = []) {
	if (element.childElementCount == 0) {
		list.push(element)
		return list
	}

	for (let child of element.children) {
		leafNodes(child, list)
	}
	return list
}

function contentRects() {
	const root = document.getElementById("content")
	const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
	const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft

	return leafNodes(root).map(el => {
		let r = el.getBoundingClientRect()

		r.x += scrollLeft
		r.y += scrollTop

		paddingx = r.width * 0.5
		paddingy = r.height * 0.5

		return r
	}).filter(r => r.width !== 0 && r.height !== 0)
}

function highlightBoundingBoxes() {
	let ctx = canvas.getCtx()

	console.log("Rects:")
	ctx.fillStyle = "red"
	ctx.fillRect(139, 266, 10, 10)

	for (let rect of contentRects()) {
		console.log(rect)
		let {x, y, width, height} = rect
		ctx.fillRect(x, y, width, height)
	}
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function uncoverOnRect(rect) {
	let {tlI, tlJ, brI, brJ} = renderer.mapRect(mainCtx, rect)

	for (let i = tlI; i <= brI; i++) {
		for (let j = tlJ; j <= brJ; j++) {
			game.hit(i, j, propagate = 0)
		}
	}
}

function propagateFromRect(rect) {
	let { tlI, tlJ, brI, brJ } = renderer.mapRect(mainCtx, rect)

	for (let i = tlI; i <= brI; i++) {
		game.hit(i, tlJ, propagate = 2)
		game.hit(i, brJ, propagate = 2)
	}

	for (let j = tlJ; j <= brJ; j++) {
		game.hit(tlI, j, propagate = 2)
		game.hit(brI, j, propagate = 2)
	}
}

function canvasEvent(ev) {
	return ev.target == mainCanvas || ev.target.childElementCount != 0
}

function leftclick(ev) {
	if (!canvasEvent(ev)) return
	let x = ev.pageX, y = ev.pageY
	let {i, j} = renderer.mapMouse(mainCtx, x, y)

	let state = game.getState(i, j)
	if (state === Game.REVELED) {
		let count = game.getValue(i, j)
		let nonflags = []
		for (let [di, dj] of Game.DIRS) {
			if (game.getState(i + di, j + dj) === Game.FLAG) {
				count--
			} else {
				nonflags.push([i + di, j + dj])
			}
		}

		if (count <= 0) {
			for (let [ni, nj] of nonflags) {
				game.hit(ni, nj)
			}
		}
	} else {
		game.hit(i, j)
	}

	renderer.render(mainCtx, game)
}

function rightclick(ev) {
	if (!canvasEvent(ev)) return
	ev.preventDefault()
	let x = ev.pageX, y = ev.pageY
	let {i, j} = renderer.mapMouse(mainCtx, x, y)
	game.flag(i, j)
	renderer.render(mainCtx, game)
}

function main() {
	window.onresize = restart
	window.addEventListener('click', leftclick)
	window.addEventListener('touchstart', leftclick)
	window.addEventListener('contextmenu', rightclick)
	restart()
}
