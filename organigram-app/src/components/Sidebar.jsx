import './Sidebar.css'

function Sidebar({
  organigrams,
  currentOrganigramId,
  onSelectOrganigram,
  onDeleteOrganigram,
  onNewOrganigram,
  onExport,
  onExportPDF,
  onImport
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>📊 Organigrams</h1>
        <button className="btn btn-primary full-width" onClick={onNewOrganigram}>
          + New Organigram
        </button>

        <div className="sidebar-actions" style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button className="btn btn-secondary full-width" onClick={onExport} style={{ marginBottom: '10px' }}>
            Export JSON
          </button>
          <button className="btn btn-secondary full-width" onClick={onExportPDF} style={{ marginBottom: '10px' }}>
            Export PDF
          </button>
          <label className="btn btn-secondary full-width" style={{ cursor: 'pointer', textAlign: 'center' }}>
            Import JSON
            <input type="file" accept=".yaml,.json" onChange={onImport} style={{ display: 'none' }} />
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
