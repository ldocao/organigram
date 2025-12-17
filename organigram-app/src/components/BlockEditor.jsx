import { useState, useRef } from 'react'
import { DEFAULT_BLOCK, COLORS } from '../utils/constants'
import './BlockEditor.css'

function BlockEditor({ block, onSave, onClose }) {
  const [formData, setFormData] = useState(block || DEFAULT_BLOCK)
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, image: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{block ? 'Edit Block' : 'Create Block'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Group Name (optional)</label>
            <input
              type="text"
              value={formData.groupName || ''}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              placeholder="e.g., Engineering, Sales Team, HR..."
            />
            <small style={{ color: '#666', fontSize: '12px' }}>Highest priority - shown most prominently</small>
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Person or position name"
            />
          </div>
          <div className="form-group">
            <label>Title (optional)</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Manager, Developer..."
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
  )
}

export default BlockEditor
