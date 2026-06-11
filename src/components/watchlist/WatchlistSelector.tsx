import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmPopover from '../ui/ConfirmPopover'
import {
  createWatchlist, renameWatchlist, deleteWatchlist,
  type WatchlistMeta,
} from '../../api/watchlists'
import './WatchlistSelector.css'

interface Props {
  watchlists: WatchlistMeta[]
  activeId: number
  onSelect: (id: number) => void
}

export default function WatchlistSelector({ watchlists, activeId, onSelect }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing !== null) editRef.current?.focus()
  }, [editing])

  const useDropdown = watchlists.length > 4

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameWatchlist(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      setEditing(null)
    },
  })

  const createMut = useMutation({
    mutationFn: (name: string) => createWatchlist(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      onSelect(data.id)
      setShowNew(false)
      setNewName('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteWatchlist(id),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      if (deletedId === activeId) {
        const remaining = watchlists.find(w => w.id !== deletedId)
        if (remaining) onSelect(remaining.id)
      }
      setDeleteId(null)
    },
  })

  function startEdit(wl: WatchlistMeta) {
    setEditing(wl.id)
    setEditValue(wl.name)
  }

  function commitEdit() {
    if (editing === null) return
    const trimmed = editValue.trim()
    const editedWl = watchlists.find(w => w.id === editing)
    if (trimmed && editedWl && trimmed !== editedWl.name) {
      renameMut.mutate({ id: editing, name: trimmed })
    } else {
      setEditing(null)
    }
  }

  return (
    <div className="wl-selector">
      {/* Tab strip (≤ 4 lists) or select dropdown (> 4) */}
      {useDropdown ? (
        <select
          className="wl-selector__dropdown field__input"
          value={activeId}
          onChange={e => onSelect(Number(e.target.value))}
          aria-label="Select watchlist"
        >
          {watchlists.map(wl => (
            <option key={wl.id} value={wl.id}>{wl.name}</option>
          ))}
        </select>
      ) : (
        <div className="wl-selector__tabs" role="tablist" aria-label="Watchlists">
          {watchlists.map(wl => (
            <div key={wl.id} className={`wl-tab${wl.id === activeId ? ' wl-tab--active' : ''}`}>
              {editing === wl.id ? (
                <input
                  ref={editRef}
                  className="wl-tab__edit field__input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  aria-label="Edit watchlist name"
                />
              ) : (
                <button
                  className="wl-tab__btn text-caption"
                  role="tab"
                  aria-selected={wl.id === activeId}
                  onClick={() => onSelect(wl.id)}
                  onDoubleClick={() => startEdit(wl)}
                  title="Double-click to rename"
                >
                  {wl.name}
                  {wl.item_count > 0 && (
                    <span className="wl-tab__count">{wl.item_count}</span>
                  )}
                </button>
              )}
              {/* All lists are deletable — only the very last one is blocked by the backend */}
              <span style={{ position: 'relative' }}>
                <button
                  className="wl-tab__delete"
                  onClick={() => setDeleteId(wl.id)}
                  aria-label={`Delete ${wl.name}`}
                  title={`Delete ${wl.name}`}
                >×</button>
                {deleteId === wl.id && (
                  <ConfirmPopover
                    message={`Delete "${wl.name}" and all its tickers?`}
                    onConfirm={() => deleteMut.mutate(wl.id)}
                    onCancel={() => setDeleteId(null)}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* New List */}
      {showNew ? (
        <div className="wl-selector__new">
          <input
            className="field__input wl-selector__new-input"
            placeholder="List name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) createMut.mutate(newName.trim())
              if (e.key === 'Escape') { setShowNew(false); setNewName('') }
            }}
            autoFocus
            aria-label="New watchlist name"
          />
          <button
            className="btn btn--primary btn--sm"
            onClick={() => newName.trim() && createMut.mutate(newName.trim())}
          >Create</button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { setShowNew(false); setNewName('') }}
          >Cancel</button>
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm wl-selector__add" onClick={() => setShowNew(true)}>
          + New List
        </button>
      )}
    </div>
  )
}
