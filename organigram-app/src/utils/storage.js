import jsyaml from 'js-yaml'

export const Storage = {
  async save(key, data) {
    if (key !== 'organigrams') return // Only persist organigrams for now
    try {
      await fetch('/api/organigrams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    } catch (e) {
      console.error('Storage error:', e)
    }
  },

  async load(key) {
    if (key !== 'organigrams') return null
    try {
      const response = await fetch('/api/organigrams')
      if (!response.ok) throw new Error('Network response was not ok')
      return await response.json()
    } catch (e) {
      console.error('Storage error:', e)
      return null
    }
  },

  exportData(organigrams) {
    try {
      const json = JSON.stringify(organigrams, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `organigrams_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
      alert('Failed to export JSON')
    }
  },

  importData(file, callback) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let data
        try {
            data = JSON.parse(e.target.result)
        } catch (jsonErr) {
            // If JSON fails, try YAML
            data = jsyaml.load(e.target.result)
        }
        
        if (Array.isArray(data)) {
            callback(data)
        } else if (data && data.organigrams && Array.isArray(data.organigrams)) {
            callback(data.organigrams)
        } else {
            alert('Invalid file format. Expected an array of organigrams.')
        }
      } catch (err) {
        console.error('Import error:', err)
        alert('Failed to import file')
      }
    }
    reader.readAsText(file)
  }
}

