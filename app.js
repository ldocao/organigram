const { useState, useEffect, useRef } = React;

const COLORS = [
    '#ffffff', '#e3f2fd', '#e8f5e9', '#fff3e0', 
    '#fce4ec', '#f3e5f5', '#e0f2f1', '#fff9c4'
];

const DEFAULT_BLOCK = {
    id: Date.now(),
    type: 'person',
    name: '',
    image: null,
    comment: '',
    color: '#ffffff',
    x: 50,
    y: 50,
    children: [],
    collapsed: false
};

// Storage utility
const Storage = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage error:', e);
        }
    },
    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },
    exportToYAML(organigrams) {
        try {
            const yaml = jsyaml.dump({ organigrams });
            const blob = new Blob([yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `organigrams_${Date.now()}.yaml`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export error:', e);
            alert('Failed to export YAML');
        }
    },
    importFromYAML(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = jsyaml.load(e.target.result);
                callback(data.organigrams || []);
            } catch (err) {
                console.error('Import error:', err);
                alert('Failed to import YAML');
            }
        };
        reader.readAsText(file);
    }
};

// Block Component
function Block({ block, onSelect, isSelected, onUpdate, onDelete, level = 0 }) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const blockRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.closest('.block-actions') || e.target.closest('.fold-button')) return;
        setIsDragging(true);
        const rect = blockRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        onSelect(block.id);
        e.stopPropagation();
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const canvas = blockRef.current.parentElement;
            const canvasRect = canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left - dragOffset.x + canvas.scrollLeft;
            const y = e.clientY - canvasRect.top - dragOffset.y + canvas.scrollTop;
            onUpdate({ ...block, x: Math.max(0, x), y: Math.max(0, y) });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, block, onUpdate]);

    const toggleCollapse = () => {
        onUpdate({ ...block, collapsed: !block.collapsed });
    };

    const addChild = () => {
        const newChild = {
            ...DEFAULT_BLOCK,
            id: Date.now(),
            x: block.x + 50,
            y: block.y + 100
        };
        onUpdate({
            ...block,
            children: [...block.children, newChild]
        });
    };

    const updateChild = (childId, updatedChild) => {
        onUpdate({
            ...block,
            children: block.children.map(c => c.id === childId ? updatedChild : c)
        });
    };

    const deleteChild = (childId) => {
        onUpdate({
            ...block,
            children: block.children.filter(c => c.id !== childId)
        });
    };

    return (
        <>
            <div
                ref={blockRef}
                className={`block ${block.type} ${isSelected ? 'selected' : ''}`}
                style={{
                    left: block.x,
                    top: block.y,
                    backgroundColor: block.color,
                    borderLeftColor: block.type === 'group' ? block.color : undefined
                }}
                onMouseDown={handleMouseDown}
            >
                <div className="block-header">
                    {block.image ? (
                        <img src={block.image} alt={block.name} className="block-image" />
                    ) : (
                        <div className="block-image">
                            {block.type === 'group' ? '👥' : '👤'}
                        </div>
                    )}
                    <div className="block-info">
                        <div className="block-name">{block.name || 'Unnamed'}</div>
                        <div className="block-type">{block.type}</div>
                    </div>
                </div>
                {block.comment && <div className="block-comment">{block.comment}</div>}
                <div className="block-actions">
                    {block.type === 'group' && (
                        <button className="btn btn-secondary" onClick={addChild}>
                            + Add Child
                        </button>
                    )}
                    {block.children.length > 0 && (
                        <button className="fold-button" onClick={toggleCollapse}>
                            {block.collapsed ? '▶ Unfold' : '▼ Fold'}
                        </button>
                    )}
                </div>
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
                                level={level + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// Block Editor Modal
function BlockEditor({ block, onSave, onClose }) {
    const [formData, setFormData] = useState(block || DEFAULT_BLOCK);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData({ ...formData, image: event.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{block ? 'Edit Block' : 'Create Block'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="person">Person</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Name / Head</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Picture</label>
                        <div className="file-input-wrapper">
                            <label className="file-input-label">
                                Choose Image
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                        {formData.image && (
                            <img src={formData.image} alt="Preview" className="image-preview" />
                        )}
                    </div>
                    <div className="form-group">
                        <label>Comment</label>
                        <textarea
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Color</label>
                        <div className="color-picker">
                            {COLORS.map(color => (
                                <div
                                    key={color}
                                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #ddd' : 'none' }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {block ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Main App
function App() {
    const [organigrams, setOrganigrams] = useState([]);
    const [currentOrganigramId, setCurrentOrganigramId] = useState(null);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [editingBlock, setEditingBlock] = useState(null);
    const [showNewOrganigramModal, setShowNewOrganigramModal] = useState(false);
    const canvasRef = useRef(null);

    // Load from storage on mount
    useEffect(() => {
        const saved = Storage.load('organigrams');
        if (saved && saved.length > 0) {
            setOrganigrams(saved);
            setCurrentOrganigramId(saved[0].id);
        }
    }, []);

    // Save to storage on change
    useEffect(() => {
        if (organigrams.length > 0) {
            Storage.save('organigrams', organigrams);
        }
    }, [organigrams]);

    const currentOrganigram = organigrams.find(o => o.id === currentOrganigramId);

    const createOrganigram = (name) => {
        const newOrganigram = {
            id: Date.now(),
            name,
            blocks: [],
            createdAt: new Date().toISOString()
        };
        setOrganigrams([...organigrams, newOrganigram]);
        setCurrentOrganigramId(newOrganigram.id);
        setShowNewOrganigramModal(false);
    };

    const deleteOrganigram = (id) => {
        if (confirm('Are you sure you want to delete this organigram?')) {
            const newOrganigrams = organigrams.filter(o => o.id !== id);
            setOrganigrams(newOrganigrams);
            if (currentOrganigramId === id) {
                setCurrentOrganigramId(newOrganigrams[0]?.id || null);
            }
        }
    };

    const addBlock = (blockData) => {
        const newBlock = { ...blockData, id: Date.now() };
        setOrganigrams(organigrams.map(o =>
            o.id === currentOrganigramId
                ? { ...o, blocks: [...o.blocks, newBlock] }
                : o
        ));
        setEditingBlock(null);
    };

    const updateBlock = (blockId, updatedBlock) => {
        setOrganigrams(organigrams.map(o =>
            o.id === currentOrganigramId
                ? { ...o, blocks: o.blocks.map(b => b.id === blockId ? updatedBlock : b) }
                : o
        ));
        setEditingBlock(null);
    };

    const deleteBlock = (blockId) => {
        if (confirm('Delete this block?')) {
            setOrganigrams(organigrams.map(o =>
                o.id === currentOrganigramId
                    ? { ...o, blocks: o.blocks.filter(b => b.id !== blockId) }
                    : o
            ));
            setSelectedBlockId(null);
        }
    };

    const resetLayout = () => {
        if (!currentOrganigram) return;
        const padding = 50;
        const spacingX = 250;
        const spacingY = 200;
        
        setOrganigrams(organigrams.map(o =>
            o.id === currentOrganigramId
                ? {
                    ...o,
                    blocks: o.blocks.map((block, index) => ({
                        ...block,
                        x: padding + (index % 3) * spacingX,
                        y: padding + Math.floor(index / 3) * spacingY
                    }))
                }
                : o
        ));
    };

    const handleExport = () => {
        Storage.exportToYAML(organigrams);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (file) {
            Storage.importFromYAML(file, (imported) => {
                setOrganigrams(imported);
                if (imported.length > 0) {
                    setCurrentOrganigramId(imported[0].id);
                }
            });
        }
    };

    const selectedBlock = currentOrganigram?.blocks.find(b => b.id === selectedBlockId);

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h1>📊 Organigrams</h1>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => setShowNewOrganigramModal(true)}
                    >
                        + New Organigram
                    </button>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={handleExport} style={{ flex: 1 }}>
                            Export
                        </button>
                        <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', margin: 0 }}>
                            Import
                            <input
                                type="file"
                                accept=".yaml,.yml"
                                onChange={handleImport}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>
                <div className="organigram-list">
                    {organigrams.map(org => (
                        <div
                            key={org.id}
                            className={`organigram-item ${org.id === currentOrganigramId ? 'active' : ''}`}
                            onClick={() => setCurrentOrganigramId(org.id)}
                        >
                            <h3>{org.name}</h3>
                            <p>{org.blocks.length} blocks</p>
                            <button
                                className="btn btn-danger"
                                style={{ marginTop: '8px', width: '100%' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOrganigram(org.id);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="canvas-container">
                {currentOrganigram ? (
                    <>
                        <div className="canvas-toolbar">
                            <h2>{currentOrganigram.name}</h2>
                            <button className="btn btn-primary" onClick={() => setEditingBlock({})}>
                                + Add Block
                            </button>
                            {selectedBlock && (
                                <>
                                    <button className="btn btn-secondary" onClick={() => setEditingBlock(selectedBlock)}>
                                        Edit
                                    </button>
                                    <button className="btn btn-danger" onClick={() => deleteBlock(selectedBlockId)}>
                                        Delete
                                    </button>
                                </>
                            )}
                            <button className="btn btn-secondary" onClick={resetLayout}>
                                Reset Layout
                            </button>
                        </div>
                        <div
                            ref={canvasRef}
                            className="canvas"
                            onClick={() => setSelectedBlockId(null)}
                        >
                            {currentOrganigram.blocks.map(block => (
                                <Block
                                    key={block.id}
                                    block={block}
                                    onSelect={setSelectedBlockId}
                                    isSelected={block.id === selectedBlockId}
                                    onUpdate={(updated) => updateBlock(block.id, updated)}
                                    onDelete={() => deleteBlock(block.id)}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <p>Create or select an organigram to get started</p>
                    </div>
                )}
            </div>

            {showNewOrganigramModal && (
                <div className="modal-overlay" onClick={() => setShowNewOrganigramModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Organigram</h2>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.elements.name.value;
                            createOrganigram(name);
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
                    block={editingBlock.id ? editingBlock : null}
                    onSave={(data) => {
                        if (editingBlock.id) {
                            updateBlock(editingBlock.id, data);
                        } else {
                            addBlock(data);
                        }
                    }}
                    onClose={() => setEditingBlock(null)}
                />
            )}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
