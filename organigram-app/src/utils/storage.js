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

  exportToYAML(organigrams) {
    try {
      const yaml = jsyaml.dump({ organigrams })
      const blob = new Blob([yaml], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `organigrams_${Date.now()}.yaml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
      alert('Failed to export YAML')
    }
  },

  importFromYAML(file, callback) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = jsyaml.load(e.target.result)
        callback(data.organigrams || [])
      } catch (err) {
        console.error('Import error:', err)
        alert('Failed to import YAML')
      }
    }
    reader.readAsText(file)
  }
}
