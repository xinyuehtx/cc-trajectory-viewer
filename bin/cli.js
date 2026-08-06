#!/usr/bin/env node
// cc-trajectory-viewer CLI
// Subcommands:
//   view (default)  serve the web app + a trajectory, open the browser
//   extract         build an annotation scaffold (.trajv.json) from a trajectory
//   skill install   copy the bundled Claude Code skill into .claude/skills
// Uses only Node.js builtins — zero runtime dependencies.

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { buildUnits } from './units.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const DIST_DIR = join(PKG_ROOT, 'dist')
const SKILL_DIR = join(PKG_ROOT, 'skill')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

const HELP = `
cc-trajectory-viewer — visualize a Claude Code trajectory in the browser

Usage:
  trajv [file.jsonl] [options]         Open a trajectory (default: view)
  trajv extract <file.jsonl> [opts]    Write an annotation scaffold (.trajv.json)
  trajv skill install [--dir <dir>]    Install the Claude Code skill into .claude/skills

View options:
  -p, --port <n>      Port to listen on (default: 4179)
  -a, --ann <file>    Annotation JSON to overlay (default: <file>.trajv.json if present)
      --no-open       Do not open the browser automatically

Extract options:
  -o, --out <file>    Output path (default: <file>.trajv.json)
      --lang <name>   Target language to record in the scaffold (e.g. "简体中文")

General:
  -h, --help          Show this help
  -v, --version       Show version

Examples:
  trajv ~/.claude/projects/my-proj/abc123.jsonl
  trajv session.jsonl -p 8080 --no-open
  trajv extract session.jsonl --lang "简体中文"
  trajv session.jsonl --ann session.trajv.json
  trajv skill install
`

async function readVersion() {
  try {
    const pkg = JSON.parse(await readFile(join(PKG_ROOT, 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function openBrowser(url) {
  const platform = process.platform
  const cmd =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true })
    child.on('error', () => {})
    child.unref()
  } catch {
    /* ignore — user can open manually */
  }
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type })
  res.end(body)
}

async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0])
  if (rel === '/' || rel === '') rel = '/index.html'
  const filePath = join(DIST_DIR, rel)
  if (!filePath.startsWith(DIST_DIR)) {
    send(res, 403, 'Forbidden')
    return
  }
  try {
    const data = await readFile(filePath)
    send(res, 200, data, MIME[extname(filePath)] || 'application/octet-stream')
  } catch {
    // SPA fallback
    try {
      const html = await readFile(join(DIST_DIR, 'index.html'))
      send(res, 200, html, MIME['.html'])
    } catch {
      send(res, 404, 'Not found')
    }
  }
}

// ---------------------------------------------------------------- arg parse
function parseArgs(argv) {
  const a = { port: 4179, open: true, out: undefined, ann: undefined, lang: undefined, _: [] }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--help' || t === '-h') a.help = true
    else if (t === '--version' || t === '-v') a.version = true
    else if (t === '--no-open') a.open = false
    else if (t === '--port' || t === '-p') a.port = parseInt(argv[++i], 10)
    else if (t.startsWith('--port=')) a.port = parseInt(t.slice(7), 10)
    else if (t === '--out' || t === '-o') a.out = argv[++i]
    else if (t === '--ann' || t === '-a') a.ann = argv[++i]
    else if (t === '--lang') a.lang = argv[++i]
    else if (t === '--dir') a.dir = argv[++i]
    else if (!t.startsWith('-')) a._.push(t)
  }
  if (!Number.isFinite(a.port)) a.port = 4179
  return a
}

// ------------------------------------------------------------- subcommands
async function cmdExtract(args) {
  const file = args._[0]
  if (!file) {
    console.error('✗ extract requires a trajectory file.\n  trajv extract <file.jsonl>')
    process.exit(1)
  }
  const abs = resolve(process.cwd(), file)
  if (!existsSync(abs)) {
    console.error(`✗ File not found: ${abs}`)
    process.exit(1)
  }
  const raw = await readFile(abs, 'utf8')
  const units = buildUnits(raw)
  const scaffold = { version: 1, targetLang: args.lang || '', units }
  const out = args.out ? resolve(process.cwd(), args.out) : abs + '.trajv.json'
  await writeFile(out, JSON.stringify(scaffold, null, 2) + '\n', 'utf8')
  const texts = units.filter((u) => u.type === 'text').length
  const clusters = units.filter((u) => u.type === 'cluster').length
  console.log(`✓ Wrote annotation scaffold: ${out}`)
  console.log(`  ${texts} text unit(s), ${clusters} tool-cluster(s).`)
  console.log('  Fill in "summary" / "translation" fields, then:')
  console.log(`    trajv "${file}" --ann "${out}"`)
}

async function cmdSkillInstall(args) {
  if (!existsSync(SKILL_DIR)) {
    console.error(`✗ Bundled skill not found at ${SKILL_DIR}`)
    process.exit(1)
  }
  const targetRoot = resolve(process.cwd(), args.dir || '.')
  const dest = join(targetRoot, '.claude', 'skills')
  await mkdir(dest, { recursive: true })
  await cp(SKILL_DIR, dest, { recursive: true })
  console.log(`✓ Installed skill(s) into ${dest}`)
  console.log('  Restart Claude Code (or reload) to pick up the new skill.')
}

async function cmdView(args) {
  if (!existsSync(DIST_DIR)) {
    console.error(
      '✗ Built web assets not found (dist/).\n' +
        '  If you are running from source, build first:  npm run build',
    )
    process.exit(1)
  }

  let trajectory = null
  let trajectoryName = null
  let annotations = null
  if (args._[0]) {
    const abs = resolve(process.cwd(), args._[0])
    if (!existsSync(abs)) {
      console.error(`✗ File not found: ${abs}`)
      process.exit(1)
    }
    trajectory = await readFile(abs)
    trajectoryName = abs

    // Annotations: explicit --ann, else sibling <file>.trajv.json if present.
    const annPath = args.ann
      ? resolve(process.cwd(), args.ann)
      : abs + '.trajv.json'
    if (existsSync(annPath)) {
      try {
        annotations = await readFile(annPath)
        console.log(`  annotations: ${annPath}`)
      } catch {
        /* ignore */
      }
    }
  }

  const server = createServer(async (req, res) => {
    const url = req.url || '/'
    if (url.startsWith('/api/trajectory')) {
      if (trajectory) {
        res.setHeader('X-Trajectory-Name', encodeURIComponent(basename(trajectoryName || '')))
        send(res, 200, trajectory, 'application/x-ndjson; charset=utf-8')
      } else send(res, 204, '')
      return
    }
    if (url.startsWith('/api/annotations')) {
      if (annotations) send(res, 200, annotations, MIME['.json'])
      else send(res, 204, '')
      return
    }
    await serveStatic(res, url)
  })

  const listen = (port, attemptsLeft) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) listen(port + 1, attemptsLeft - 1)
      else {
        console.error(`✗ Server error: ${err.message}`)
        process.exit(1)
      }
    })
    server.listen(port, () => {
      const uiUrl = `http://localhost:${port}/`
      console.log('\n  ◆ Claude Code Trajectory Viewer')
      if (trajectoryName) console.log(`  file:  ${trajectoryName}`)
      else console.log('  mode:  upload (drop a .jsonl in the browser)')
      console.log(`  url:   ${uiUrl}`)
      console.log('\n  Press Ctrl+C to stop.\n')
      if (args.open) openBrowser(uiUrl)
    })
  }
  listen(args.port, 15)
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (args.version) {
    process.stdout.write((await readVersion()) + '\n')
    return
  }

  const sub = args._[0]
  if (sub === 'extract') {
    args._ = args._.slice(1)
    if (args.help) return void process.stdout.write(HELP)
    return cmdExtract(args)
  }
  if (sub === 'skill') {
    // `trajv skill install`
    args._ = args._.slice(1)
    if (args._[0] === 'install' || args._.length === 0) {
      args._ = args._.slice(1)
      return cmdSkillInstall(args)
    }
    console.error('✗ Unknown skill command. Use: trajv skill install')
    process.exit(1)
  }
  if (args.help) return void process.stdout.write(HELP)

  return cmdView(args)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
