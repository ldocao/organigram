import { jsPDF } from 'jspdf';

export const exportToPDF = (organigram) => {
    if (!organigram || !organigram.blocks || organigram.blocks.length === 0) return;

    const blocks = organigram.blocks;
    const connections = organigram.connections || [];

    // 1. Calculate Bounding Box
    // We assume a standard block width if not available, but blocks might be variable.
    // For PDF, we can assume a fixed width or try to estimate.
    // Block.jsx min-width is 240px. Let's assume ~280px width and ~120px height for calculation safe area.
    // Improvements: Pass exact dimensions if managed in state.
    const BLOCK_WIDTH = 250;
    const BLOCK_HEIGHT = 120; // Avg height

    const minX = Math.min(...blocks.map(b => b.x)) - 50;
    const minY = Math.min(...blocks.map(b => b.y)) - 50;
    const maxX = Math.max(...blocks.map(b => b.x + BLOCK_WIDTH)) + 50;
    const maxY = Math.max(...blocks.map(b => b.y + BLOCK_HEIGHT)) + 50;

    const width = Math.max(maxX - minX, 100);
    const height = Math.max(maxY - minY, 100);

    // Initialize PDF with custom size matching the content
    const doc = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height] // Custom size
    });

    // Helper to transform world coords to PDF coords
    // We shift everything by -minX, -minY so (minX, minY) is at (0,0)
    const tx = (val) => val - minX;
    const ty = (val) => val - minY;

    // 2. Draw Connections
    // Set line style
    doc.setDrawColor(150, 150, 150); // Gray
    doc.setLineWidth(2);

    connections.forEach(conn => {
        const fromBlock = blocks.find(b => b.id === conn.from);
        const toBlock = blocks.find(b => b.id === conn.to);
        if (!fromBlock || !toBlock) return;

        // Mimic the S-curve from Canvas.jsx
        const startX = tx(fromBlock.x + BLOCK_WIDTH / 2); // Center of parent
        const startY = ty(fromBlock.y + BLOCK_HEIGHT);    // Bottom of parent (approx)

        // Child top center
        const endX = tx(toBlock.x + BLOCK_WIDTH / 2);
        const endY = ty(toBlock.y);

        // Beziers
        // const cp1x = startX;
        // const cp1y = startY + (endY - startY) / 2;
        // const cp2x = endX;
        // const cp2y = startY + (endY - startY) / 2;

        // doc.lines is complex for bezier. use logic or simple lines.
        // jsPDF has 'curveTo'? 
        // It has lines method which supports bezier 'c'.

        // Using low-level API for Bezier:
        // c cp1x cp1y cp2x cp2y x y
        // We need to move to start first.

        // doc.lines([[cp1x, cp1y, cp2x, cp2y, endX, endY]], startX, startY, [1, 1], 'S', true) // Complex

        // Easier: doc.curveTo(cp1x, cp1y, cp2x, cp2y, endX, endY) ? No.
        // As per docs: doc.context2d... or explicit pdf operators.

        // Actually jsPDF has .curveTo? No, it's .bezierCurveTo in context2d plugin or lines.
        // doc.lines segment: [c1x, c1y, c2x, c2y, eX, eY] corresponds to 'c' operator (cubic bezier relative)
        // or absolute if we manage it.

        // Simplest: Draw straight lines for now, or simple elbow.
        // Curve support in raw jsPDF is tricky without canvas context.
        // Let's try simple straight line first for robustness, or approximate.
        doc.line(startX, startY, endX, endY);
    });

    // 3. Draw Blocks
    blocks.forEach(block => {
        const x = tx(block.x);
        const y = ty(block.y);
        const w = BLOCK_WIDTH;
        const h = BLOCK_HEIGHT; // Approximate

        // Background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);

        // Simple rect with rounded corners (rx, ry)
        doc.roundedRect(x, y, w, h, 8, 8, 'FD');

        // Content Layout
        let currentY = y + 15;

        // 1. Group Name (Top Left, smaller)
        if (block.groupName) {
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100); // Gray
            doc.setFont("helvetica", "bold");
            doc.text(String(block.groupName), x + 10, currentY);
            currentY += 15;
        }

        // 2. Image (Circle/Square on the left or top?)
        // In Block.jsx, image is on the left of text.
        // Let's allocate space.
        let textX = x + 15;
        if (block.image) {
            try {
                // Draw Image (Avatar style)
                // x + 10, currentY
                const imgSize = 40;
                doc.addImage(block.image, 'JPEG', x + 10, currentY, imgSize, imgSize);
                textX = x + 10 + imgSize + 10;

                // Adjust text Y to center align with image roughly or start at top of image
            } catch (e) {
                console.warn('Failed to add image to PDF', e);
            }
        }

        // 3. Name (Bold, Primary)
        // Adjust Y if image is present
        const contentStartY = block.image ? currentY + 10 : currentY + 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(String(block.name || 'Unnamed'), textX, contentStartY);

        // 4. Title (Normal, Secondary)
        if (block.title) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(String(block.title), textX, contentStartY + 15);
        }

        // 5. Comment (Italic, Tertiary)
        if (block.comment) {
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "italic");
            doc.text(String(block.comment), textX, contentStartY + 30);
        }

    });

    doc.save(`${organigram.name || 'organigram'}.pdf`);
}
