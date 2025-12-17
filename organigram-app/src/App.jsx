import { useState, useEffect } from 'react'
import './App.css'
import './styles/buttons.css'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import BlockEditor from './components/BlockEditor'
import { Storage } from './utils/storage'
import { exportToPDF } from './utils/pdfExporter'
import { GRID_SIZE } from './utils/constants'

function App() {
  const [organigrams, setOrganigrams] = useState([])
  const [currentOrganigramId, setCurrentOrganigramId] = useState(null)
  const [selectedBlockIds, setSelectedBlockIds] = useState([])
  const [editingBlock, setEditingBlock] = useState(null)
  const [showNewOrganigramModal, setShowNewOrganigramModal] = useState(false)

  // Load from storage on mount
  // Load from storage on mount
  useEffect(() => {
    const loadData = async () => {
      const saved = await Storage.load('organigrams')
      if (saved && saved.length > 0) {
        setOrganigrams(saved)
        setCurrentOrganigramId(saved[0].id)
      }
    }
    loadData()
  }, [])

  // Save to storage on change
  useEffect(() => {
    if (organigrams.length > 0) {
      Storage.save('organigrams', organigrams)
    }
  }, [organigrams])

  const currentOrganigram = organigrams.find(o => o.id === currentOrganigramId)

  const createOrganigram = (name) => {
    const newOrganigram = {
      id: Date.now(),
      name,
      blocks: [],
      connections: [],
      createdAt: new Date().toISOString()
    }
    setOrganigrams(prev => [...prev, newOrganigram])
    setCurrentOrganigramId(newOrganigram.id)
    setShowNewOrganigramModal(false)
  }

  const handleAddConnection = (fromId, toId, fromPos, toPos) => {
    // Normalize direction: Always Parent (from) -> Child (to)
    // Parent emits from 'bottom', Child receives at 'top'.

    let parentId = fromId
    let childId = toId

    // If user dragged from Top (Child) to Bottom (Parent), swap.
    if (fromPos === 'top' && toPos === 'bottom') {
      parentId = toId
      childId = fromId
    } else if (fromPos === fromPos) {
      // If ambiguous (Top->Top or Bottom->Bottom), use Y coordinate to determine hierarchy
      const blockA = organigrams.find(o => o.id === currentOrganigramId)?.blocks.find(b => b.id === fromId)
      const blockB = organigrams.find(o => o.id === currentOrganigramId)?.blocks.find(b => b.id === toId)
      if (blockA && blockB) {
        if (blockA.y > blockB.y) {
          // A is below B. B is Parent.
          parentId = toId
          childId = fromId
        }
      }
    }

    // Check existing
    const exists = organigrams.find(o => o.id === currentOrganigramId).connections.some(
      c => c.from === parentId && c.to === childId
    )
    if (exists) return

    setOrganigrams(prev => prev.map(o =>
      o.id === currentOrganigramId
        ? { ...o, connections: [...o.connections, { from: parentId, to: childId }] }
        : o
    ))
  }

  const deleteOrganigram = (id) => {
    if (confirm('Are you sure you want to delete this organigram?')) {
      const newOrganigrams = organigrams.filter(o => o.id !== id)
      setOrganigrams(newOrganigrams)
      if (currentOrganigramId === id) {
        setCurrentOrganigramId(newOrganigrams[0]?.id || null)
      }
    }
  }

  const handleSelectBlock = (selection) => {
    if (Array.isArray(selection)) {
      setSelectedBlockIds(selection)
    } else if (selection === null) {
      setSelectedBlockIds([])
    } else {
      // If we receive a single ID, for now let's just exclusively select it
      // The Canvas will handle the logic of "shift+click" or "drag select" and pass the appropriate array/id
      setSelectedBlockIds([selection])
    }
  }

  const addBlock = (blockData, referenceId = null, position = 'child') => {
    const newBlock = { ...blockData, id: Date.now() }

    setOrganigrams(organigrams.map(o => {
      if (o.id !== currentOrganigramId) return o

      const referenceBlock = referenceId ? o.blocks.find(b => b.id === referenceId) : null
      let updatedBlock = { ...newBlock }

      if (referenceBlock) {
        if (position === 'parent') {
          // Place new block above reference
          updatedBlock.x = referenceBlock.x
          updatedBlock.y = referenceBlock.y - 150 // 150px gap approx
        } else {
          // Place new block below reference
          updatedBlock.x = referenceBlock.x
          updatedBlock.y = referenceBlock.y + 150
        }
      }

      const updatedOrganigram = { ...o, blocks: [...o.blocks, updatedBlock] }

      if (referenceId) {
        if (position === 'parent') {
          // Link: New (Parent) -> Reference (Child)
          updatedOrganigram.connections = [
            ...(o.connections || []),
            { from: updatedBlock.id, to: referenceId, fromPos: 'bottom', toPos: 'top' }
          ]
        } else {
          // Link: Reference (Parent) -> New (Child)
          updatedOrganigram.connections = [
            ...(o.connections || []),
            { from: referenceId, to: updatedBlock.id, fromPos: 'bottom', toPos: 'top' }
          ]
        }
      }
      return updatedOrganigram
    }))
    setEditingBlock(null)
  }

  const updateBlock = (blockId, updatedBlock) => {
    setOrganigrams(prev => prev.map(o =>
      o.id === currentOrganigramId
        ? { ...o, blocks: o.blocks.map(b => b.id === blockId ? updatedBlock : b) }
        : o
    ))
    setEditingBlock(null)
  }

  const updateBlocks = (updates) => { // updates: [{id, block}]
    setOrganigrams(prev => prev.map(o => {
      if (o.id !== currentOrganigramId) return o

      const newBlocks = o.blocks.map(b => {
        const update = updates.find(u => u.id === b.id)
        return update ? update.block : b
      })

      return { ...o, blocks: newBlocks }
    }))
  }

  const deleteBlock = (blockId = null) => {
    // If blockId provided, delete that one.
    // If not, delete all selected.
    const idsToDelete = blockId ? [blockId] : selectedBlockIds

    if (idsToDelete.length === 0) return

    setOrganigrams(organigrams.map(o =>
      o.id === currentOrganigramId
        ? { ...o, blocks: o.blocks.filter(b => !idsToDelete.includes(b.id)) }
        : o
    ))
    // Clear selection if deleted blocks were selected
    setSelectedBlockIds(prev => prev.filter(id => !idsToDelete.includes(id)))
  }

  const resetLayout = () => {
    if (!currentOrganigram) return

    setOrganigrams(organigrams.map(o =>
      o.id === currentOrganigramId
        ? {
          ...o,
          blocks: o.blocks.map(block => ({
            ...block,
            x: Math.round(block.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(block.y / GRID_SIZE) * GRID_SIZE
          }))
        }
        : o
    ))
  }

  const handleExport = () => {
    Storage.exportToYAML(organigrams)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (file) {
      Storage.importFromYAML(file, (imported) => {
        setOrganigrams(imported)
        if (imported.length > 0) {
          setCurrentOrganigramId(imported[0].id)
        }
      })
    }
  }

  const handleExportPDF = () => {
    if (currentOrganigram) {
      exportToPDF(currentOrganigram)
    }
  }

  return (
    <div className="app-container">
      <Sidebar
        organigrams={organigrams}
        currentOrganigramId={currentOrganigramId}
        onSelectOrganigram={setCurrentOrganigramId}
        onDeleteOrganigram={deleteOrganigram}
        onNewOrganigram={() => setShowNewOrganigramModal(true)}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onImport={handleImport}
      />

      <Canvas
        organigram={currentOrganigram}
        selectedBlockIds={selectedBlockIds}
        onSelectBlock={handleSelectBlock}
        onUpdateBlock={updateBlock}
        onUpdateBlocks={updateBlocks}
        onDeleteBlock={deleteBlock}
        onAddBlock={(parentId, position) => setEditingBlock({ parentId, position })}
        onEditBlock={(block) => setEditingBlock(block)}
        onResetLayout={resetLayout}
        onAddConnection={handleAddConnection}
      />

      {showNewOrganigramModal && (
        <div className="modal-overlay" onClick={() => setShowNewOrganigramModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Organigram</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const name = e.target.elements.name.value
              createOrganigram(name)
            }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" name="name" required />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewOrganigramModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBlock !== null && (
        <BlockEditor
          block={editingBlock}
          onSave={(data) => {
            if (editingBlock.id) {
              updateBlock(editingBlock.id, data)
            } else {
              addBlock(data, editingBlock.parentId, editingBlock.position)
            }
          }}
          onCancel={() => setEditingBlock(null)}
        />
      )}
    </div>
  )
}

export default App
