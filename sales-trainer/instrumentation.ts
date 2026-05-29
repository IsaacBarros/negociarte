// Polyfills para pdfjs-dist@5 no runtime Node.js do Next.js.
// pdfjs-dist@5 tenta referenciar DOMMatrix, ImageData e Path2D no momento do
// carregamento do módulo — mesmo em extração de texto pura, sem renderização.
// Esses globals existem no browser mas não no Node.js.
// O instrumentation hook roda antes de qualquer route handler, garantindo que
// os globals existam quando o módulo for carregado como external package.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as Record<string, unknown>

    if (typeof g['DOMMatrix'] === 'undefined') {
      g['DOMMatrix'] = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
        m11 = 1; m12 = 0; m13 = 0; m14 = 0
        m21 = 0; m22 = 1; m23 = 0; m24 = 0
        m31 = 0; m32 = 0; m33 = 1; m34 = 0
        m41 = 0; m42 = 0; m43 = 0; m44 = 1
        is2D = true; isIdentity = true
      }
    }

    if (typeof g['ImageData'] === 'undefined') {
      g['ImageData'] = class ImageData {
        width: number; height: number; data: Uint8ClampedArray
        constructor(sw: number, sh: number) {
          this.width = sw
          this.height = sh
          this.data = new Uint8ClampedArray(sw * sh * 4)
        }
      }
    }

    if (typeof g['Path2D'] === 'undefined') {
      g['Path2D'] = class Path2D {
        addPath() { return this }
        closePath() { return this }
        moveTo() { return this }
        lineTo() { return this }
        bezierCurveTo() { return this }
        quadraticCurveTo() { return this }
        arc() { return this }
        arcTo() { return this }
        ellipse() { return this }
        rect() { return this }
      }
    }
  }
}
