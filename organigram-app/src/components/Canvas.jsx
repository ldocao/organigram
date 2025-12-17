import { useRef, useState, useEffect } from 'react'
import { GRID_SIZE } from '../utils/constants'
import Block from './Block'
import './Canvas.css'
import Minimap from './Minimap'

function Canvas({
  organigram,
  selectedBlockIds = [],
  onSelectBlock,
  onUpdateBlock,
  onUpdateBlocks,
  onDeleteBlock,
  onAddBlock,
  onEditBlock,
  onResetLayout,
  onAddConnection
}) {
  const canvasRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  // Connection dragging state
  const [isDraggingConnection, setIsDraggingConnection] = useState(false)
  const [connectionStart, setConnectionStart] = useState(null)
  const [connectionEnd, setConnectionEnd] = useState(null)

  // Block dragging state
  const [isDraggingBlock, setIsDraggingBlock] = useState(false)
  const [draggingBlockIds, setDraggingBlockIds] = useState([])
  const [blockSizes, setBlockSizes] = useState({})

  // Selection box state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const selectionBoxRef = useRef(null) // Mirror state for event access

  const connections = organigram?.connections || []

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setViewportSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        })
      }
    }

    window.addEventListener('resize', handleResize)
    // Defer initial size check to ensure ref is mounted
    setTimeout(handleResize, 0)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Track spacebar for panning mode
  const spacePressed = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        spacePressed.current = true
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
      }
    }
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spacePressed.current = false
        if (canvasRef.current && !isPanning) canvasRef.current.style.cursor = 'default'
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPanning])

  // Helper to convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX, screenY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (screenX - rect.left - viewOffset.x) / zoom,
      y: (screenY - rect.top - viewOffset.y) / zoom
    }
  }

  // Combined drag effect
  useEffect(() => {
    if (!isDraggingConnection && !isDraggingBlock && !isSelecting && !isPanning) return

    const handleMouseMove = (e) => {
      if (!canvasRef.current) return

      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      const { x, y } = screenToCanvas(e.clientX, e.clientY)

      if (isDraggingConnection) {
        setConnectionEnd({ x, y })
      } else if (isDraggingBlock && draggingBlockIds.length > 0) {
        // Block dragging logic in separate effect
      } else if (isSelecting) {
        const newBox = {
          x: Math.min(selectionStart.x, x),
          y: Math.min(selectionStart.y, y),
          width: Math.abs(x - selectionStart.x),
          height: Math.abs(y - selectionStart.y)
        }
        setSelectionBox(newBox)
        selectionBoxRef.current = newBox
      }
    }

    const handleMouseUp = () => {
      if (isSelecting && selectionBoxRef.current) {
        // Finalize selection using Ref
        const currentBox = selectionBoxRef.current
        const selectedIds = []
        organigram.blocks.forEach(block => {
          const size = blockSizes[block.id] || { width: 200, height: 100 } // approx
          const blockRight = block.x + size.width
          const blockBottom = block.y + size.height

          // Check intersection
          if (
            block.x < currentBox.x + currentBox.width &&
            blockRight > currentBox.x &&
            block.y < currentBox.y + currentBox.height &&
            blockBottom > currentBox.y
          ) {
            selectedIds.push(block.id)
          }
        })
        onSelectBlock(selectedIds)
      }

      setIsDraggingConnection(false)
      setConnectionStart(null)
      setConnectionEnd(null)

      setIsDraggingBlock(false)
      setDraggingBlockIds([])
      // Clean up other drag states if we add them
      setIsSelecting(false)
      setSelectionBox(null)
      selectionBoxRef.current = null
      setSelectionStart(null)

      setIsPanning(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingConnection, isDraggingBlock, draggingBlockIds, isSelecting, selectionStart, isPanning, panStart, zoom, viewOffset, organigram]) // dependencies need to be correct

  // We need a separate `useEffect` or Ref to handle the "Follow Mouse" for multi-drag efficiently 
  // because we can't easily capture "initial positions" in the effect dependency loop without resetting it.
  // Use a Ref for drag state to avoid stale closures in event listeners?
  const dragRef = useRef({
    startMouse: null,
    initialBlocks: {} // id -> {x, y}
  })

  useEffect(() => {
    if (!isDraggingBlock) return

    const handleMouseMove = (e) => {
      if (!canvasRef.current) return
      // Use screenToCanvas logic but we need delta in canvas units.
      // Since zoom is constant during drag, simpler to calculate screen delta then divide by zoom.

      const currentX = e.clientX
      const currentY = e.clientY

      const deltaX = (currentX - dragRef.current.startMouse.x) / zoom
      const deltaY = (currentY - dragRef.current.startMouse.y) / zoom

      // Update all dragged blocks
      const updates = []
      draggingBlockIds.forEach(id => {
        const initial = dragRef.current.initialBlocks[id]
        if (initial) {
          const block = organigram.blocks.find(b => b.id === id)
          if (block) {
            updates.push({
              id,
              block: {
                ...block,
                x: initial.x + deltaX,
                y: initial.y + deltaY
              }
            })
          }
        }
      })

      if (updates.length > 0) {
        if (onUpdateBlocks) {
          onUpdateBlocks(updates)
        } else {
          updates.forEach(u => onUpdateBlock(u.id, u.block))
        }
      }
    }

    const handleMouseUp = () => {
      setIsDraggingBlock(false)
      setDraggingBlockIds([])
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingBlock, draggingBlockIds, zoom, organigram, onUpdateBlock, onUpdateBlocks])


  if (!organigram) {
    return (
      <div className="canvas-container">
        <div className="empty-state">
          <p>Create or select an organigram to get started</p>
        </div>
      </div>
    )
  }

  // Determine active/primary selection for edit buttons (e.g. the first one)
  const selectedBlock = selectedBlockIds.length === 1
    ? organigram.blocks.find(b => b.id === selectedBlockIds[0])
    : null

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleZoomReset = () => {
    setZoom(1)
    setViewOffset({ x: 0, y: 0 })
  }

  const handleWheel = (e) => {
    // Ctrl+Wheel or Pinch for Zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 3))
    } else {
      // Regular Wheel for Pan
      e.preventDefault()
      setViewOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }))
    }
  }

  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }


  const handleNodeDragStart = (blockId, position, x, y) => {
    setIsDraggingConnection(true)
    setConnectionStart({ blockId, position, x, y })
    setConnectionEnd({ x, y })
  }

  const handleBlockDragStart = (e, blockId) => {
    if (e.target.closest('.block-quick-actions') || e.target.closest('.fold-button') || e.target.closest('.attach-button') || e.target.closest('.connection-node')) return

    // Allow Space+Click on block to start panning instead of dragging block? 
    // Usually dragging block works even with space, but let's prioritize panning if Space key is held.
    if (e.button === 1 || e.nativeEvent.which === 2 || spacePressed.current) {
      return // Let canvas handler pick it up for panning
    }

    e.stopPropagation()
    e.preventDefault()

    const block = organigram.blocks.find(b => b.id === blockId)
    if (!block || !canvasRef.current) return

    // Selection logic
    let newSelectedIds = [...selectedBlockIds]
    if (!newSelectedIds.includes(blockId)) {
      // If clicking an unselected block, select it.
      // (Simple behavior: reset selection to just this one, unless shift/ctrl - but let's just reset for drag start simplicity if not selected)
      // Actually, standard behavior: if I drag an unselected item, it becomes the selection.
      newSelectedIds = [blockId]
      onSelectBlock(newSelectedIds)
    }
    // If it WAS selected, we keep the group selection to allow dragging the group.

    setIsDraggingBlock(true)
    setDraggingBlockIds(newSelectedIds)

    // Capture initial state for drag delta
    // Store SCREEN coordinates for drag start to avoid zoom confusion in delta calc
    dragRef.current.startMouse = { x: e.clientX, y: e.clientY }
    dragRef.current.initialBlocks = {}

    newSelectedIds.forEach(id => {
      const b = organigram.blocks.find(bk => bk.id === id)
      if (b) {
        dragRef.current.initialBlocks[id] = { x: b.x, y: b.y }
      }
    })
  }

  // Handle canvas background click/drag for selection box
  const handleCanvasMouseDown = (e) => {
    // If clicking directly on canvas (not block), start selection box
    // block clicks stopPropagation, so this should be fine.
    if (e.target.closest('.block')) return

    // Middle click or Spacebar held -> Pan
    if (e.button === 1 || e.nativeEvent.which === 2 || spacePressed.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    // Left click -> Selection Box
    const { x, y } = screenToCanvas(e.clientX, e.clientY)

    setIsSelecting(true)
    setSelectionStart({ x, y })
    setSelectionBox({ x, y, width: 0, height: 0 })

    // Clear selection on background click start?
    onSelectBlock([])
  }

  const handleNodeDragEnd = (blockId, position) => {
    if (isDraggingConnection && connectionStart && blockId !== connectionStart.blockId) {
      if (onAddConnection) {
        onAddConnection(connectionStart.blockId, blockId, connectionStart.position, position)
      }
    }
    setIsDraggingConnection(false)
    setConnectionStart(null)
    setConnectionEnd(null)
  }

  const handleAddRelative = (baseId, position) => {
    onAddBlock(baseId, position)
  }

  const handleBlockResize = (blockId, size) => {
    setBlockSizes(prev => {
      if (prev[blockId]?.width === size.width && prev[blockId]?.height === size.height) {
        return prev
      }
      return { ...prev, [blockId]: size }
    })
  }

  // Handle simple click (mouseup without drag) logic if needed?
  // Blocks handle their own click selection via onSelect usually, but we moved it to dragStart?
  // Block.jsx calls `onSelect` on click.
  // We should align `Block.jsx` onSelect with `onSelectBlock` from props.
  const handleBlockClick = (blockId) => {
    if (!isDraggingConnection && !isDraggingBlock && !isPanning) {
      // Single click selects just this one
      onSelectBlock([blockId])
    }
  }

  // ... handleBlockUpdate ...
  const handleBlockUpdateInternal = (blockId, updatedBlock) => {
    const snappedBlock = {
      ...updatedBlock,
      x: snapToGrid(updatedBlock.x),
      y: snapToGrid(updatedBlock.y)
    }
    onUpdateBlock(blockId, snappedBlock)
  }




  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <h2>{organigram.name}</h2>
        <button className="btn btn-primary" onClick={() => onAddBlock()}>
          + Add Block
        </button>
        {selectedBlock && (
          <>
            <button className="btn btn-secondary" onClick={() => onEditBlock(selectedBlock)}>
              Edit
            </button>
            <button className="btn btn-danger" onClick={() => onDeleteBlock(null)}>
              Delete
            </button>
          </>
        )}
        <button className="btn btn-secondary" onClick={onResetLayout}>
          Reset Layout
        </button>
        <div className="zoom-controls">
          <button className="btn btn-secondary" onClick={handleZoomOut} title="Zoom Out">
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-secondary" onClick={handleZoomIn} title="Zoom In">
            +
          </button>
          <button className="btn btn-secondary" onClick={handleZoomReset} title="Reset Zoom">
            ⟲
          </button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className={`canvas ${isDraggingConnection ? 'drawing-mode' : ''} ${isSelecting ? 'selecting-mode' : ''} ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{
          // Moving Grid Background
          backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px` // Scale grid with zoom
        }}
      >
        <Minimap
          blocks={organigram.blocks}
          viewOffset={viewOffset}
          zoom={zoom}
          viewportSize={viewportSize}
          onNavigate={setViewOffset}
        />

        {isDraggingConnection && (
          <div className="connection-hint">
            Drag to another node to create connection
          </div>
        )}
        <div
          className="canvas-content"
          style={{
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Draw temporary drag line */}
          {isDraggingConnection && connectionStart && connectionEnd && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000, overflow: 'visible' }}>
              <line
                x1={connectionStart.x}
                y1={connectionStart.y}
                x2={connectionEnd.x}
                y2={connectionEnd.y}
                stroke="#2196f3"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          )}

          {/* Draw Selection Box */}
          {isSelecting && selectionBox && (
            <div
              className="selection-box"
              style={{
                position: 'absolute',
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height,
                border: '1px solid #2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                pointerEvents: 'none',
                zIndex: 2000
              }}
            />
          )}

          {/* Draw connection lines with nodes */}
          <svg className="connection-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            {connections.map((conn, idx) => {
              const fromBlock = organigram.blocks.find(b => b.id === conn.from)
              const toBlock = organigram.blocks.find(b => b.id === conn.to)
              if (fromBlock && toBlock) {
                // Get actual block dimensions or defaults
                const fromSize = blockSizes[fromBlock.id] || { width: 200, height: 100 }
                // ...

                // Connection points: Parent (Bottom) -> Child (Top)
                const fromY = fromBlock.y + fromSize.height
                const toY = toBlock.y

                // Calculate center X for both blocks
                const fromX = fromBlock.x + fromSize.width / 2
                // const toX = toBlock.x + 200 / 2 // ToDo: fix toSize or generic width // Removed unused variable

                // We need to fetch toSize properly
                const toMeasure = blockSizes[toBlock.id] || { width: 200, height: 100 }
                const fixedToX = toBlock.x + toMeasure.width / 2

                return (
                  <g key={idx}>
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={fixedToX}
                      y2={toY}
                      stroke="#2196f3"
                      strokeWidth="2"
                    />
                    <circle cx={fromX} cy={fromY} r="6" fill="#2196f3" stroke="white" strokeWidth="2" />
                    <circle cx={fixedToX} cy={toY} r="6" fill="#2196f3" stroke="white" strokeWidth="2" />
                  </g>
                )
              }
              return null
            })}
          </svg>

          {organigram.blocks.map(block => (
            <Block
              key={block.id}
              block={block}
              onSelect={handleBlockClick}
              isSelected={selectedBlockIds.includes(block.id)}
              onUpdate={handleBlockUpdateInternal}
              onDelete={() => onDeleteBlock(block.id)}
              onEdit={onEditBlock}
              onAddChild={handleAddRelative}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragEnd={handleNodeDragEnd}
              isConnecting={isDraggingConnection}
              onMouseDown={(e) => handleBlockDragStart(e, block.id)}
              onResize={handleBlockResize}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Canvas
