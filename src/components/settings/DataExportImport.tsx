import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { EXPORT_CATEGORIES, exportData, importData, type ExportCategory, type ImportResult } from '../../api/exportImport'
import './DataExportImport.css'

const ALL_CATEGORY_KEYS = EXPORT_CATEGORIES.map(c => c.key)

function allChecked(value: boolean): Record<ExportCategory, boolean> {
  return ALL_CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<ExportCategory, boolean>)
}

function selectedKeys(selection: Record<ExportCategory, boolean>): ExportCategory[] {
  return ALL_CATEGORY_KEYS.filter(key => selection[key])
}

function formatImportSummary(result: ImportResult): string {
  const parts = Object.entries(result.imported).map(([category, count]) => {
    const label = EXPORT_CATEGORIES.find(c => c.key === category)?.label ?? category
    return `${count} ${label.toLowerCase()}`
  })
  let message = parts.length > 0 ? `Imported ${parts.join(', ')}.` : 'Nothing to import.'
  if (result.skipped.length > 0) {
    const skippedLabels = result.skipped.map(category => EXPORT_CATEGORIES.find(c => c.key === category)?.label ?? category)
    message += ` Skipped (not in file): ${skippedLabels.join(', ')}.`
  }
  return message
}

export default function DataExportImport() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exportSelection, setExportSelection] = useState<Record<ExportCategory, boolean>>(allChecked(true))
  const [importSelection, setImportSelection] = useState<Record<ExportCategory, boolean>>(allChecked(false))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const exportSelected = selectedKeys(exportSelection)
  const importSelected = selectedKeys(importSelection)
  const canImport = selectedFile !== null && importSelected.length > 0

  function toggleExport(key: ExportCategory) {
    setExportSelection(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleImport(key: ExportCategory) {
    setImportSelection(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleExport() {
    if (exportSelected.length === 0) return
    setIsExporting(true)
    setMessage(null)
    try {
      await exportData(exportSelected)
    } catch {
      setMessage({ kind: 'error', text: 'Failed to export data.' })
    } finally {
      setIsExporting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  async function handleConfirmImport() {
    if (!selectedFile) return
    setShowConfirm(false)
    setIsImporting(true)
    setMessage(null)
    try {
      const result = await importData(selectedFile, importSelected)
      setMessage({ kind: 'success', text: formatImportSummary(result) })
      queryClient.invalidateQueries()
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to import data.' })
    } finally {
      setIsImporting(false)
    }
  }

  const importSelectedLabels = importSelected.map(key => EXPORT_CATEGORIES.find(c => c.key === key)?.label ?? key)

  return (
    <section className="settings-section">
      <h2 className="text-heading">Data Export / Import</h2>

      {message && (
        <div className={`export-import-message export-import-message--${message.kind}`} role="status">
          {message.text}
        </div>
      )}

      <div className="export-import-block">
        <h3 className="text-body">Export</h3>
        <div className="category-checkboxes">
          {EXPORT_CATEGORIES.map(({ key, label }) => (
            <label key={key} className="category-checkbox text-caption">
              <input
                type="checkbox"
                checked={exportSelection[key]}
                onChange={() => toggleExport(key)}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          className="btn btn--primary"
          onClick={handleExport}
          disabled={isExporting || exportSelected.length === 0}
        >
          {isExporting ? 'Exporting…' : 'Export Selected'}
        </button>
      </div>

      <div className="export-import-block">
        <h3 className="text-body">Import</h3>
        <div className="category-checkboxes">
          {EXPORT_CATEGORIES.map(({ key, label }) => (
            <label key={key} className="category-checkbox text-caption">
              <input
                type="checkbox"
                checked={importSelection[key]}
                onChange={() => toggleImport(key)}
              />
              {label}
            </label>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          aria-label="Import file"
        />
        <button
          className="btn btn--primary"
          onClick={() => setShowConfirm(true)}
          disabled={!canImport || isImporting}
        >
          {isImporting ? 'Importing…' : 'Import Selected'}
        </button>
      </div>

      {showConfirm && createPortal(
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)} role="dialog" aria-modal="true" aria-label="Confirm import">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <span className="text-label">Replace Data?</span>
              <button className="modal__close" onClick={() => setShowConfirm(false)} aria-label="Close">×</button>
            </div>
            <div className="modal__body">
              <p className="text-body">
                This will permanently replace your {importSelectedLabels.join(', ')} on this device with the
                contents of the imported file. This cannot be undone.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleConfirmImport}>Replace Data</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
