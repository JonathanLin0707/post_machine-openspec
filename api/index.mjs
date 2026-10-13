// Vercel Function entry point.
//
// Vercel does not run `express.static()` and does not bundle `server/src` on its
// own for this monorepo, so this file re-exports the *compiled* Express app
// (`server/dist/index.js`, produced by the `buildCommand` in vercel.json).
//
// The app is a single Node handler `(req, res)`; Express matches routes against
// the original request path, which Vercel preserves when rewriting to a function.
import app from '../server/dist/index.js'

export default function handler(req, res) {
  return app(req, res)
}
