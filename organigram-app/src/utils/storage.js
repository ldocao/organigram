import jsyaml from 'js-yaml'

export const Storage = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Storage error:', e)
    }
  },
  
  load(key) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
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
