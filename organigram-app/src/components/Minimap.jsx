import { useRef, useEffect, useState } from 'react'
import './Minimap.css'

function Minimap({ blocks, viewOffset, zoom, viewportSize, onNavigate }) {
    const canvasRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    // Constants for minimap rendering
    const MINIMAP_SIZE = 150
    const PADDING = 20 // Reduced padding for tighter fit

    // Calculate world bounds based on actual block positions
    const getWorldBounds = () => {
        if (!blocks || blocks.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 600 }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

        blocks.forEach(b => {
            // Use actual block dimensions (approximate based on typical block size)
            const blockWidth = 200
            const blockHeight = 100

            minX = Math.min(minX, b.x)
            maxX = Math.max(maxX, b.x + blockWidth)
            minY = Math.min(minY, b.y)
            maxY = Math.max(maxY, b.y + blockHeight)
        })

        // Add minimal padding for visual clarity
        return {
            minX: minX - PADDING,
            maxX: maxX + PADDING,
            minY: minY - PADDING,
            maxY: maxY + PADDING
        }
    }

    const bounds = getWorldBounds()
    const worldWidth = bounds.maxX - bounds.minX
    const worldHeight = bounds.maxY - bounds.minY

    // Calculate scale to fit content in minimap
    const ratio = Math.max(worldWidth, worldHeight) / MINIMAP_SIZE
    const scale = 1 / ratio

    // Convert world coordinate to minimap coordinate
    const worldToMinimap = (x, y) => {
        return {
            x: (x - bounds.minX) * scale,
            y: (y - bounds.minY) * scale
        }
    }

    // Convert minimap coordinate to world coordinate
    const minimapToWorld = (mx, my) => {
        return {
            x: mx / scale + bounds.minX,
            y: my / scale + bounds.minY
        }
    }

    // Calculate viewport rect in world coordinates
    // Viewport top-left in world is determined by viewOffset
    // screenX = (worldX + offset) * zoom
    // worldX = screenX / zoom - offset
    // Viewport is at screen (0,0) to (width, height)
    // So world top-left: -viewOffset.x, -viewOffset.y (Wait, offset calculation: screen = (world * zoom + offset) or similar? 
    // Let's check Canvas logic: screenToCanvas: (screen - offset)/zoom. 
    // So worldX = (0 - offset.x)/zoom = -offset.x / zoom
    const viewportWorld = {
        x: -viewOffset.x / zoom,
        y: -viewOffset.y / zoom,
        width: viewportSize.width / zoom,
        height: viewportSize.height / zoom
    }

    const renderMinimap = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw Blocks
        ctx.fillStyle = '#ccc'
        blocks.forEach(b => {
            const { x, y } = worldToMinimap(b.x, b.y)
            // Fixed size representation or scaled? Scaled.
            // Block size assumption 200x100
            ctx.fillRect(x, y, 200 * scale, 100 * scale)
        })

        // Draw Viewport Rect
        const vPos = worldToMinimap(viewportWorld.x, viewportWorld.y)
        ctx.strokeStyle = '#2196f3'
        ctx.lineWidth = 2
        ctx.strokeRect(
            vPos.x,
            vPos.y,
            viewportWorld.width * scale,
            viewportWorld.height * scale
        )
    }

    useEffect(() => {
        renderMinimap()
    })

    const handleMouseDown = (e) => {
        setIsDragging(true)
        handleMouseMove(e) // Jump to position
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return

        const rect = canvasRef.current.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top

        // We want center of viewport to be at mouse
        // World center:
        const worldPos = minimapToWorld(mx, my)

        // Calculate new viewOffset such that worldPos is at center of screen
        // screenCenter = (worldPos * zoom) + offset
        // offset = screenCenter - (worldPos * zoom)

        const screenCenterX = viewportSize.width / 2
        const screenCenterY = viewportSize.height / 2

        const newOffset = {
            x: screenCenterX - (worldPos.x * zoom),
            y: screenCenterY - (worldPos.y * zoom)
        }

        onNavigate(newOffset)
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    return (
        <div className="minimap-container" style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}>
            <canvas
                ref={canvasRef}
                width={MINIMAP_SIZE}
                height={MINIMAP_SIZE}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    )
}

export default Minimap
