# Organigram Generator

A modern, user-friendly web application for creating and managing organizational charts.

## Features

✨ **Block Types**
- Person blocks: Individual employees/members
- Group blocks: Teams or departments with hierarchy support

📝 **Block Customization**
- Add names and profile pictures
- Add comments/descriptions
- Choose from 8 color themes
- Drag and drop to reposition blocks

🌲 **Hierarchical Structure**
- Create nested blocks within groups
- Fold/unfold groups to manage complexity
- Visual hierarchy with proper indentation

💾 **Data Management**
- Multiple organigrams support
- Auto-save to browser localStorage
- Export to YAML format
- Import from YAML files

🎨 **User Experience**
- Clean, modern interface
- Drag-and-drop positioning
- "Reset Layout" button for auto-alignment
- Responsive design

## How to Use

### Getting Started

1. Open `index.html` in your web browser (Chrome, Firefox, Safari, or Edge)
2. Click "**+ New Organigram**" to create your first organizational chart
3. Give it a name and click "Create"

### Creating Blocks

1. Click "**+ Add Block**" in the toolbar
2. Choose the type (Person or Group)
3. Enter the name
4. Optionally add:
   - A profile picture
   - A comment/description
   - A custom color
5. Click "Create"

### Building Hierarchy

1. For **Group blocks**, you can add child blocks:
   - Click "**+ Add Child**" button on any group block
   - This creates a nested block within that group
2. Use "**▼ Fold**" / "**▶ Unfold**" to collapse/expand groups

### Moving Blocks

- **Drag and drop** any block to reposition it
- Click "**Reset Layout**" to automatically align all blocks in a grid

### Editing Blocks

1. Click on a block to select it
2. Click "**Edit**" in the toolbar
3. Modify any properties
4. Click "Save"

### Managing Organigrams

- **Switch between organigrams**: Click on any organigram in the left sidebar
- **Delete organigram**: Click the "Delete" button on the organigram card
- **Export all data**: Click "Export" to download a YAML file
- **Import data**: Click "Import" and select a previously exported YAML file

## Storage

- All data is automatically saved to your browser's localStorage
- Data persists between sessions
- Export to YAML for backup or sharing
- Import YAML files to restore or transfer data

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## No Installation Required

This is a standalone web application that runs entirely in your browser. No server, no installation, no dependencies to manage.

## Tips

- Use **Group blocks** for departments, teams, or organizational units
- Use **Person blocks** for individual employees
- **Colors** help distinguish different departments or levels
- **Comments** are great for roles, responsibilities, or contact info
- **Export regularly** to backup your work
- The **Reset Layout** button helps when blocks become messy

## Keyboard Shortcuts

- Click outside blocks to deselect
- ESC key closes modals

## Privacy

All data stays on your computer in your browser's localStorage. Nothing is sent to any server.
