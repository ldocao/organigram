# Organigram App

A powerful and intuitive organizational chart creator built with React and Vite. Create, edit, and visualize hierarchical structures with drag-and-drop functionality, collapsible nodes, and export capabilities.

## Features

- 🎯 **Interactive Canvas**: Drag-and-drop blocks, pan, and zoom
- 🔗 **Connection Management**: Create visual connections between blocks
- 📊 **Hierarchical Layout**: Automatic tree layout with the "Reset Layout" button
- 📁 **Multiple Organigrams**: Manage multiple organizational charts
- 💾 **Import/Export**: Save and load organigrams as YAML files
- 📄 **PDF Export**: Export your organigrams as PDF documents
- 🎨 **Customizable Blocks**: Add names, titles, groups, images, and comments
- 🔄 **Collapsible Nodes**: Hide/show subtrees for better visualization
- ⌨️ **Keyboard Shortcuts**: Delete blocks with Delete/Backspace, pan with Space+drag

## Prerequisites

- **Node.js** (version 18 or higher recommended)
- **npm** or **yarn** package manager

## Installation

1. Clone or download the repository
2. Navigate to the project directory:
   ```bash
   cd organigram-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## How to Use

This application requires both a **frontend development server** and a **backend server** to run.

### Start the Backend Server

In your first terminal window:

```bash
npm run server
```

The backend server will start on `http://localhost:3001`

### Start the Frontend Development Server

In a second terminal window:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Usage Guide

### Creating an Organigram

1. Click "+ New Organigram" in the sidebar
2. Enter a name for your organigram
3. Click "Create"

### Adding Blocks

- Click "+ Add Block" in the toolbar
- Or select a block and use the action buttons:
  - ⬆️ Add block above (parent)
  - ⬇️ Add block below (child)
  - ✏️ Edit block

### Creating Connections

- Drag from the connection node (blue dot) on one block to another block
- Connections automatically establish parent-child relationships

### Organizing Layout

- Click "Reset Layout" to automatically arrange all blocks in a hierarchical tree structure
- All blocks will be expanded and positioned symmetrically
- Each generation is aligned horizontally with proper spacing

### Canvas Navigation

- **Pan**: Hold Space and drag, or use middle mouse button
- **Zoom**: Ctrl/Cmd + scroll wheel
- **Select Multiple**: Click and drag on empty canvas to create selection box
- **Move Blocks**: Click and drag blocks (works with multiple selection)

### Collapsing Nodes

- Select a block with children
- Click the fold button (▼/▶️) to collapse/expand the subtree

### Keyboard Shortcuts

- `Delete` or `Backspace`: Delete selected blocks or connections
- `Space + Drag`: Pan the canvas

### Import/Export

- **Export**: Click "Export" to download all organigrams as a YAML file
- **Import**: Click "Import" to load organigrams from a YAML file
- **PDF Export**: Click "Export PDF" to save the current organigram as a PDF

## Project Structure

```
organigram-app/
├── src/
│   ├── components/       # React components
│   │   ├── Block.jsx     # Individual block component
│   │   ├── Canvas.jsx    # Main canvas with drag/zoom
│   │   ├── Sidebar.jsx   # Organigram list sidebar
│   │   └── ...
│   ├── utils/           # Utility functions
│   │   ├── storage.js   # LocalStorage & YAML handling
│   │   ├── pdfExporter.js
│   │   └── constants.js
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── server/              # Backend server
│   └── index.js         # Express server for API
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Available Scripts

- `npm run dev` - Start the Vite development server (frontend)
- `npm run server` - Start the Express backend server
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Express** - Backend server
- **jsPDF** - PDF generation
- **js-yaml** - YAML parsing and generation
- **LocalStorage** - Client-side data persistence

## Browser Compatibility

Modern browsers with ES6+ support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Port Already in Use

If port 5173 or 3001 is already in use:
- Frontend: Vite will automatically try the next available port
- Backend: Edit `server/index.js` and change the port number

### Backend Connection Issues

Ensure both servers are running:
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

## License

This project is private and proprietary.
