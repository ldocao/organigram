import { useRef, useLayoutEffect } from 'react'
import { DEFAULT_BLOCK } from '../utils/constants'
import './Block.css'

function Block({ block, onSelect, isSelected, onUpdate, onEdit, onAddChild, onNodeDragStart, onNodeDragEnd, isConnecting, onMouseDown, onResize, level = 0 }) {
  const blockRef = useRef(null)

  useLayoutEffect(() => {
    if (blockRef.current && onResize) {
      const { offsetWidth, offsetHeight } = blockRef.current
      onResize(block.id, { width: offsetWidth, height: offsetHeight })
    }
  }, [block.id, isSelected, block.name, block.title, block.groupName, block.comment, block.collapsed, onResize])

  const handleClick = (e) => {
    if (e.target.closest('.block-quick-actions') || e.target.closest('.fold-button') || e.target.closest('.attach-button')) return
    onSelect(block.id)
    e.stopPropagation()
  }

  const toggleCollapse = () => {
    onUpdate({ ...block, collapsed: !block.collapsed })
  }

  const handleNodeMouseDown = (e, position) => {
    e.stopPropagation()
    e.preventDefault()

    if (onNodeDragStart) {
      const blockRect = blockRef.current.getBoundingClientRect()

      const x = block.x + (blockRect.width / 2)
      const y = position === 'top' ? block.y : block.y + blockRect.height

      onNodeDragStart(block.id, position, x, y)
    }
  }

  const handleNodeMouseUp = (e, position) => {
    e.stopPropagation()
    if (onNodeDragEnd) {
      onNodeDragEnd(block.id, position)
    }
  }

  const handleBlockMouseUp = (e) => {
    // Allow dropping connection anywhere on the block
    if (onNodeDragEnd) {
      const rect = e.currentTarget.getBoundingClientRect()
      // Determine closest connection point based on click position
      const relativeY = e.clientY - rect.top
      const position = relativeY < rect.height / 2 ? 'top' : 'bottom'

      onNodeDragEnd(block.id, position)
    }
  }

  const updateChild = (childId, updatedChild) => {
    onUpdate({
      ...block,
      children: block.children.map(c => c.id === childId ? updatedChild : c)
    })
  }

  const deleteChild = (childId) => {
    onUpdate({
      ...block,
      children: block.children.filter(c => c.id !== childId)
    })
  }

  return (
    <>
      <div
        ref={blockRef}
        className={`block ${isSelected ? 'selected' : ''} ${isConnecting ? 'target-mode' : ''}`}
        style={{
          left: block.x,
          top: block.y,
          backgroundColor: block.color
        }}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        onMouseUp={handleBlockMouseUp}
      >
        {/* Connection nodes - draggable */}
        <div
          className="connection-node connection-node-top"
          title="Drag to connect"
          onMouseDown={(e) => handleNodeMouseDown(e, 'top')}
          onMouseUp={(e) => handleNodeMouseUp(e, 'top')}
        ></div>
        <div
          className="connection-node connection-node-bottom"
          title="Drag to connect"
          onMouseDown={(e) => handleNodeMouseDown(e, 'bottom')}
          onMouseUp={(e) => handleNodeMouseUp(e, 'bottom')}
        ></div>

        <div className="block-content-wrapper">
          {block.image && (
            <div className="block-image-container">
              <img src={block.image} alt={block.name} className="block-image" />
            </div>
          )}

          <div className="block-info">
            {/* Priority 1: Group Name */}
            {block.groupName && <div className="block-group-name">{block.groupName}</div>}

            {/* Priority 2: Person Name */}
            <div className="block-name">{block.name || 'Unnamed'}</div>

            {/* Priority 3: Title */}
            {block.title && <div className="block-title">{block.title}</div>}

            {/* Priority 4: Comments */}
            {block.comment && <div className="block-comment">{block.comment}</div>}
          </div>
        </div>

        {isSelected && (
          <div className="block-quick-actions">
            <button
              className="quick-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onEdit && onEdit(block)
              }}
              title="Edit"
            >
              ✏️
            </button>
            <button
              className="quick-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                // onAddChild now behaves as "Add Below"
                onAddChild && onAddChild(block.id, 'child')
              }}
              title="Add block below"
            >
              ⬇️
            </button>
            <button
              className="quick-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                // New prop onAddParent for "Add Above" (we'll reuse onAddChild prop name or pass a new one)
                // Let's assume we pass a new prop or reuse onAddChild with a mode.
                // To keep it clean, let's look for a new prop `onAddParent` passed from Canvas.
                if (onAddChild) onAddChild(block.id, 'parent')
              }}
              title="Add block above"
            >
              ⬆️
            </button>
            {block.children.length > 0 && (
              <button
                className="quick-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCollapse()
                }}
                title={block.collapsed ? 'Unfold' : 'Fold'}
              >
                {block.collapsed ? '▶️' : '▼'}
              </button>
            )}
          </div>
        )}

        {block.children.length > 0 && !block.collapsed && (
          <div className="block-children">
            {block.children.map(child => (
              <Block
                key={child.id}
                block={child}
                onSelect={onSelect}
                isSelected={false}
                onUpdate={(updated) => updateChild(child.id, updated)}
                onDelete={() => deleteChild(child.id)}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onNodeDragStart={onNodeDragStart}
                onNodeDragEnd={onNodeDragEnd}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Block
