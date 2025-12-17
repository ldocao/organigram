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
  const [selectedConnection, setSelectedConnection] = useState(null)
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
    setSelectedConnection(null) // Clear connection selection
    if (Array.isArray(selection)) {
      setSelectedBlockIds(selection)
    } else if (selection === null) {
      setSelectedBlockIds([])
    } else {
      setSelectedBlockIds([selection])
    }
  }

  const handleSelectConnection = (connection) => {
    setSelectedBlockIds([]) // Clear block selection
    setSelectedConnection(connection)
  }

  const deleteConnection = (connection) => {
    if (!connection) return
    setOrganigrams(prev => prev.map(o =>
      o.id === currentOrganigramId
        ? { ...o, connections: o.connections.filter(c => c.from !== connection.from || c.to !== connection.to) }
        : o
    ))
    setSelectedConnection(null)
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

    const blocks = currentOrganigram.blocks
    const connections = currentOrganigram.connections || []

    // Step 1: Expand all collapsed blocks first
    const expandedBlocks = blocks.map(block => ({
      ...block,
      collapsed: false
    }))

    // Build parent-child relationships
    const childrenMap = new Map() // parentId -> [childIds]
    const parentMap = new Map() // childId -> parentId

    connections.forEach(conn => {
      if (!childrenMap.has(conn.from)) {
        childrenMap.set(conn.from, [])
      }
      childrenMap.get(conn.from).push(conn.to)
      parentMap.set(conn.to, conn.from)
    })

    // Find root nodes (blocks with no parents)
    const roots = expandedBlocks.filter(b => !parentMap.has(b.id))

    // Calculate levels for each block
    const levels = new Map() // blockId -> level
    const calculateLevel = (blockId, level = 0) => {
      levels.set(blockId, level)
      const children = childrenMap.get(blockId) || []
      children.forEach(childId => calculateLevel(childId, level + 1))
    }

    roots.forEach(root => calculateLevel(root.id))

    // Group blocks by level
    const blocksByLevel = new Map()
    expandedBlocks.forEach(block => {
      const level = levels.get(block.id) || 0
      if (!blocksByLevel.has(level)) {
        blocksByLevel.set(level, [])
      }
      blocksByLevel.get(level).push(block)
    })

    // Layout constants
    const BLOCK_WIDTH = 200 // Approximate block width
    const MIN_HORIZONTAL_SPACING = 80 // Minimum space between blocks
    const VERTICAL_SPACING = 200
    const START_X = 100
    const START_Y = 100

    // Two-pass layout algorithm:
    // Pass 1: Calculate subtree widths bottom-up
    // Pass 2: Position blocks top-down, centering children under parents

    const newPositions = new Map()
    const subtreeWidths = new Map() // blockId -> total width needed for this subtree

    // Pass 1: Calculate subtree width for each block (bottom-up)
    const calculateSubtreeWidth = (blockId) => {
      if (subtreeWidths.has(blockId)) {
        return subtreeWidths.get(blockId)
      }

      const children = childrenMap.get(blockId) || []
      
      if (children.length === 0) {
        // Leaf node: just the block width
        subtreeWidths.set(blockId, BLOCK_WIDTH)
        return BLOCK_WIDTH
      }

      // Calculate total width needed for all children
      let totalChildrenWidth = 0
      children.forEach((childId, index) => {
        const childWidth = calculateSubtreeWidth(childId)
        totalChildrenWidth += childWidth
        if (index < children.length - 1) {
          totalChildrenWidth += MIN_HORIZONTAL_SPACING
        }
      })

      // The subtree width is the maximum of:
      // - The block's own width
      // - The total width needed for all children
      const subtreeWidth = Math.max(BLOCK_WIDTH, totalChildrenWidth)
      subtreeWidths.set(blockId, subtreeWidth)
      return subtreeWidth
    }

    // Calculate widths for all blocks starting from roots
    roots.forEach(root => calculateSubtreeWidth(root.id))

    // Pass 2: Position blocks top-down
    const positionSubtree = (blockId, centerX, level) => {
      // Position the current block centered at centerX
      const blockX = centerX - BLOCK_WIDTH / 2
      const blockY = START_Y + level * VERTICAL_SPACING
      
      newPositions.set(blockId, { x: blockX, y: blockY })

      // Position children symmetrically under this block
      const children = childrenMap.get(blockId) || []
      if (children.length > 0) {
        // Calculate total width needed for children
        let totalChildrenWidth = 0
        children.forEach((childId, index) => {
          totalChildrenWidth += subtreeWidths.get(childId) || BLOCK_WIDTH
          if (index < children.length - 1) {
            totalChildrenWidth += MIN_HORIZONTAL_SPACING
          }
        })

        // Start position for first child (left-aligned under parent's subtree)
        let childX = centerX - totalChildrenWidth / 2

        // Position each child
        children.forEach((childId) => {
          const childSubtreeWidth = subtreeWidths.get(childId) || BLOCK_WIDTH
          const childCenterX = childX + childSubtreeWidth / 2
          
          positionSubtree(childId, childCenterX, level + 1)
          
          childX += childSubtreeWidth + MIN_HORIZONTAL_SPACING
        })
      }
    }

    // Position each root tree
    let currentX = START_X
    roots.forEach((root, index) => {
      const rootWidth = subtreeWidths.get(root.id) || BLOCK_WIDTH
      const rootCenterX = currentX + rootWidth / 2
      
      positionSubtree(root.id, rootCenterX, 0)
      
      // Move to next root position
      currentX += rootWidth + MIN_HORIZONTAL_SPACING * 3 // Extra spacing between separate trees
    })

    // Apply new positions and expanded state
    setOrganigrams(organigrams.map(o =>
      o.id === currentOrganigramId
        ? {
          ...o,
          blocks: o.blocks.map(block => ({
            ...block,
            collapsed: false, // Expand all blocks
            x: newPositions.get(block.id)?.x || block.x,
            y: newPositions.get(block.id)?.y || block.y
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
        selectedConnection={selectedConnection}
        onSelectConnection={handleSelectConnection}
        onDeleteConnection={deleteConnection}
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
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  )
}

export default App
