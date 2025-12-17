import './Sidebar.css'

function Sidebar({ 
  organigrams, 
  currentOrganigramId, 
  onSelectOrganigram, 
  onDeleteOrganigram,
  onNewOrganigram,
  onExport,
  onImport 
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>📊 Organigrams</h1>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onNewOrganigram}
        >
          + New Organigram
        </button>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onExport} style={{ flex: 1 }}>
            Export
          </button>
          <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', margin: 0 }}>
            Import
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={onImport}
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
            onClick={() => onSelectOrganigram(org.id)}
          >
            <h3>{org.name}</h3>
            <p>{org.blocks.length} blocks</p>
            <button
              className="btn btn-danger"
              style={{ marginTop: '8px', width: '100%' }}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteOrganigram(org.id)
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
