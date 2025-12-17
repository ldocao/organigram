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

        // Background - use block's color or default to white
        const bgColor = block.color || '#ffffff';
        // Convert hex to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 255, b: 255 };
        };

        const rgb = hexToRgb(bgColor);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.setDrawColor(221, 221, 221); // #ddd border
        doc.setLineWidth(2);

        // Rounded rect with border
        doc.roundedRect(x, y, w, h, 8, 8, 'FD');

        // Content Layout
        let currentY = y + 20;

        // 1. Group Name (Top, uppercase, blue, bold, with underline)
        if (block.groupName) {
            doc.setFontSize(16);
            doc.setTextColor(25, 118, 210); // #1976d2
            doc.setFont("helvetica", "bold");
            const groupText = String(block.groupName).toUpperCase();
            doc.text(groupText, x + 16, currentY);

            // Add underline
            const textWidth = doc.getTextWidth(groupText);
            doc.setDrawColor(33, 150, 243); // #2196f3
            doc.setLineWidth(2);
            doc.line(x + 16, currentY + 2, x + 16 + textWidth, currentY + 2);

            currentY += 20;
        }

        // 2. Image (if present)
        let textX = x + 16;
        if (block.image) {
            try {
                const imgSize = 64;
                doc.addImage(block.image, 'JPEG', x + 16, currentY, imgSize, imgSize);
                textX = x + 16 + imgSize + 10;
            } catch (e) {
                console.warn('Failed to add image to PDF', e);
            }
        }

        // 3. Name (Bold, dark gray #333)
        const contentStartY = block.image ? currentY + 15 : currentY;

        doc.setTextColor(51, 51, 51); // #333
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text(String(block.name || 'Unnamed'), textX, contentStartY);

        // 4. Title (Semi-bold italic, medium gray #666)
        if (block.title) {
            doc.setFontSize(13);
            doc.setTextColor(102, 102, 102); // #666
            doc.setFont("helvetica", "italic");
            doc.text(String(block.title), textX, contentStartY + 18);
        }

        // 5. Comment (Regular, light gray #888) - Note: not shown in UI but included in PDF
        if (block.comment) {
            doc.setFontSize(12);
            doc.setTextColor(136, 136, 136); // #888
            doc.setFont("helvetica", "normal");
            doc.text(String(block.comment), textX, contentStartY + 36);
        }

    });

    doc.save(`${organigram.name || 'organigram'}.pdf`);
}
