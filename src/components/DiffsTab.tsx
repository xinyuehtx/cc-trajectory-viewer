import { useMemo } from 'react'
import { ChevronDown, Columns2, FileCode, Rows3 } from 'lucide-react'
import type { FileHistory, FileVersion } from '../lib/diff'
import { useI18n } from '../lib/i18n'
import { DiffBody, type DiffMode } from './DiffView'

function historyAnchor(h: FileHistory): string {
  return `diff-${h.versions[0]?.firstEventId ?? h.path}`
}

// ------------------------------------------------------------------ file tree
interface TreeNode {
  name: string
  children: TreeNode[]
  file?: { anchor: string; edits: number; path: string }
}

/** Build a compact directory tree from the edited file paths. */
function buildTree(histories: FileHistory[]): TreeNode {
  const segLists = histories.map((h) => h.path.split('/').filter(Boolean))
  // Strip the deepest directory prefix shared by every file.
  let common = 0
  if (segLists.length) {
    const first = segLists[0]
    for (let i = 0; i < first.length - 1; i++) {
      if (segLists.every((s) => s.length > i + 1 && s[i] === first[i])) common++
      else break
    }
  }

  const root: TreeNode = { name: '', children: [] }
  histories.forEach((h) => {
    const segs = h.path.split('/').filter(Boolean).slice(common)
    let node = root
    segs.forEach((seg, idx) => {
      const isFile = idx === segs.length - 1
      let child = node.children.find((c) => c.name === seg && Boolean(c.file) === isFile)
      if (!child) {
        child = { name: seg, children: [] }
        node.children.push(child)
      }
      if (isFile) {
        child.file = { anchor: historyAnchor(h), edits: h.editCount, path: h.path }
      }
      node = child
    })
  })

  // Fold single-child folder chains: src → components becomes "src/components".
  const fold = (n: TreeNode): TreeNode => {
    let node = n
    while (!node.file && node.children.length === 1 && !node.children[0].file) {
      const only = node.children[0]
      node = { name: node.name ? `${node.name}/${only.name}` : only.name, children: only.children, file: only.file }
    }
    node.children = node.children.map(fold)
    return node
  }
  root.children = root.children.map(fold)
  return root
}

function scrollToAnchor(anchor: string) {
  const el = document.getElementById(anchor)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function TreeNodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const pad = { paddingLeft: `${depth * 14 + 8}px` }
  if (node.file) {
    return (
      <button className="tree-file" style={pad} title={node.file.path} onClick={() => scrollToAnchor(node.file!.anchor)}>
        <FileCode size={13} className="tree-file-icon" />
        <span className="tree-file-name">{node.name}</span>
        <span className="tree-file-edits">{node.file.edits}</span>
      </button>
    )
  }
  return (
    <div className="tree-folder-group">
      <div className="tree-folder" style={pad}>
        <ChevronDown size={12} className="tree-folder-icon" />
        {node.name}
      </div>
      {node.children.map((c, i) => (
        <TreeNodeRow key={c.name + i} node={c} depth={depth + 1} />
      ))}
    </div>
  )
}

function FileTree({ histories }: { histories: FileHistory[] }) {
  const { t } = useI18n()
  const tree = useMemo(() => buildTree(histories), [histories])
  return (
    <aside className="diff-tree">
      <div className="diff-tree-title">
        {t('sidebar.modifiedFiles')} <span className="count">{histories.length}</span>
      </div>
      <div className="diff-tree-body">
        {tree.children.map((c, i) => (
          <TreeNodeRow key={c.name + i} node={c} depth={0} />
        ))}
      </div>
    </aside>
  )
}

// ------------------------------------------------------------------ versions
function VersionBlock({
  history,
  version,
  showVersion,
  mode,
  wrap,
}: {
  history: FileHistory
  version: FileVersion
  showVersion: boolean
  mode: DiffMode
  wrap: boolean
}) {
  const { t } = useI18n()
  return (
    <div className={`diff${wrap ? ' wrap' : ''}`} id={`diff-${version.firstEventId}`}>
      <div className="diff-header">
        <span className="diff-path" title={history.path}>
          {history.path || '(no path)'}
        </span>
        <span className="diff-meta">
          {showVersion && (
            <span className={`diff-version-badge${version.external ? ' external' : ''}`}>
              {t('diffs.version', { n: version.index + 1 })}
            </span>
          )}
          {version.external && (
            <span className="diff-external-note">{t('diffs.externalChange')}</span>
          )}
          {version.added > 0 && <span className="diff-added">+{version.added}</span>}
          {version.removed > 0 && <span className="diff-removed">−{version.removed}</span>}
        </span>
      </div>
      <DiffBody rows={version.rows} language={history.language} mode={mode} />
    </div>
  )
}

export default function DiffsTab({
  histories,
  editCount,
  mode,
  onModeChange,
  wrap,
  onWrapChange,
}: {
  histories: FileHistory[]
  editCount: number
  mode: DiffMode
  onModeChange: (m: DiffMode) => void
  wrap: boolean
  onWrapChange: (w: boolean) => void
}) {
  const { t } = useI18n()

  if (histories.length === 0) {
    return (
      <div className="diffs-empty">
        <p>{t('diffs.noEdits')}</p>
      </div>
    )
  }

  const changesKey = editCount === 1 ? 'diffs.changes' : 'diffs.changes_plural'

  return (
    <div className="diffs-tab">
      <FileTree histories={histories} />

      <div className="diffs-main">
        <div className="diffs-toolbar">
          <span className="diffs-count">{t(changesKey, { n: editCount })}</span>
          <div className="diffs-toolbar-controls">
            <label className="wrap-toggle">
              <input type="checkbox" checked={wrap} onChange={(e) => onWrapChange(e.target.checked)} />
              {t('diffs.wrap')}
            </label>
            <div className="mode-toggle" role="tablist" aria-label="Diff view mode">
              <button
                className={mode === 'unified' ? 'active' : ''}
                onClick={() => onModeChange('unified')}
              >
                <Rows3 size={14} /> {t('diffs.unified')}
              </button>
              <button className={mode === 'split' ? 'active' : ''} onClick={() => onModeChange('split')}>
                <Columns2 size={14} /> {t('diffs.split')}
              </button>
            </div>
          </div>
        </div>

        <div className="diffs-list">
          {histories.map((h) => (
            <div className="diff-card diff-file" key={h.path}>
              <div className="diff-file-versions">
                {h.versions.map((v) => (
                  <VersionBlock
                    key={v.firstEventId}
                    history={h}
                    version={v}
                    showVersion={h.versions.length > 1}
                    mode={mode}
                    wrap={wrap}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
