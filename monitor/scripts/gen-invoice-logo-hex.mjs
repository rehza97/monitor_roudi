import zlib from "node:zlib"

const W = 168
const H = 36
const rgb = Buffer.alloc(W * H * 3)
let i = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 255
    let g = 255
    let b = 255
    if (x >= 10 && x <= 52 && y >= 14 && y <= 28) {
      r = 45
      g = 52
      b = 58
    }
    if (x >= 8 && x <= 54 && y >= 10 && y <= 22) {
      r = 45
      g = 52
      b = 58
    }
    for (const [px, py] of [[54, 8], [58, 6], [62, 8], [66, 5]]) {
      if (x >= px && x < px + 4 && y >= py && y < py + 4) {
        r = 45
        g = 52
        b = 58
      }
    }
    const dx = x - 34
    const dy = y - 24
    if (dx * dx + dy * dy < 180 && y >= 20 && x <= 48) {
      r = 219
      g = 20
      b = 60
    }
    if (x >= 66) {
      r = 45
      g = 52
      b = 58
    }
    if (x >= 66 && y >= 12 && y <= 26 && x % 11 > 8) {
      r = 255
      g = 255
      b = 255
    }
    rgb[i++] = r
    rgb[i++] = g
    rgb[i++] = b
  }
}

const comp = zlib.deflateSync(rgb, { level: 9 })
process.stdout.write(comp.toString("hex").toUpperCase())
