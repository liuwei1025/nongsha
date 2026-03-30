import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express, { type NextFunction, type Request, type Response } from 'express'
import { createServer as createViteServer } from 'vite'

import { parseNoteRequestSchema } from '../src/domain/contracts.ts'
import { parseRawNote } from './parse.ts'

const app = express()
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.APP_PORT ?? 5173)

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.post('/api/parse', async (req: Request, res: Response) => {
  const parsed = parseNoteRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'The note payload is invalid.',
      issues: parsed.error.issues.map((issue) => issue.message),
    })
    return
  }

  try {
    const result = await parseRawNote(parsed.data.rawNote)
    res.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Parsing failed before the note could be structured.'
    res.status(500).json({ error: message })
  }
})

if (isProduction) {
  const distPath = path.resolve(rootDir, 'dist')
  app.use(express.static(distPath))
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  const vite = await createViteServer({
    root: rootDir,
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
  })

  app.use(vite.middlewares)

  app.get(/.*/, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.originalUrl
      const template = await fs.readFile(path.resolve(rootDir, 'index.html'), 'utf8')
      const html = await vite.transformIndexHtml(url, template)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (error) {
      vite.ssrFixStacktrace(error as Error)
      next(error)
    }
  })
}

app.listen(port, () => {
  console.log(`Nongsha listening on http://127.0.0.1:${port}`)
})
