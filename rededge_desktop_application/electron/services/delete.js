class DeleteService {
  constructor() {
    this.tasks = new Map()
    this.nextId = 1
    this.activeTaskId = null
  }

  normalizeRemotePath(remotePath) {
    if (!remotePath) return '/'
    const normalized = remotePath.startsWith('/') ? remotePath : `/${remotePath}`
    const collapsed = normalized.replace(/\/+/g, '/')
    if (collapsed.length > 1 && collapsed.endsWith('/')) {
      return collapsed.slice(0, -1)
    }
    return collapsed
  }

  joinRemotePath(basePath, name) {
    return `${basePath.replace(/\/$/, '')}/${name}`.replace(/\/+/g, '/')
  }

  parseListResponse(result) {
    const directories = []
    const files = []

    if (Array.isArray(result)) {
      for (const item of result) {
        if (typeof item === 'string') {
          if (item.includes('.')) {
            files.push({ name: item })
          } else {
            directories.push(item)
          }
        } else if (item && typeof item === 'object') {
          const name = item.name || item.filename || item.path || ''
          const type = item.type || (item.is_dir ? 'directory' : 'file')
          if (!name) continue
          if (type === 'directory') {
            directories.push(name)
          } else {
            files.push({ name })
          }
        }
      }

      return { directories, files }
    }

    if (result && (Array.isArray(result.directories) || Array.isArray(result.files))) {
      const dirNames = (result.directories || []).map(dir => (typeof dir === 'string' ? dir : dir.name || dir.path))
      directories.push(...dirNames.filter(Boolean))

      for (const file of result.files || []) {
        if (typeof file === 'string') {
          files.push({ name: file })
        } else if (file && typeof file === 'object') {
          const name = file.name || file.filename || file.path || ''
          if (!name) continue
          files.push({ name })
        }
      }
    }

    return { directories, files }
  }

  async buildDeleteList(cameraApi, item, list) {
    const remotePath = this.normalizeRemotePath(item.path || item.remote_path || '')
    const type = item.type || (item.is_dir ? 'directory' : 'file')

    if (!remotePath || remotePath === '/') {
      return
    }

    if (type !== 'directory') {
      list.push({ path: remotePath, isDir: false })
      return
    }

    const result = await cameraApi.listFiles(remotePath)
    const { directories, files } = this.parseListResponse(result)

    for (const file of files) {
      list.push({ path: this.joinRemotePath(remotePath, file.name), isDir: false })
    }

    for (const dirName of directories) {
      await this.buildDeleteList(cameraApi, { path: this.joinRemotePath(remotePath, dirName), type: 'directory' }, list)
    }

    // Attempt to delete directory after children
    list.push({ path: remotePath, isDir: true })
  }

  async startDelete(cameraApi, items = []) {
    const id = this.nextId++
    const task = {
      id,
      status: 'preparing',
      total: 0,
      completed: 0,
      error_message: null,
      started_at: new Date().toISOString()
    }

    this.tasks.set(id, task)
    this.activeTaskId = id

    setImmediate(async () => {
      try {
        task.status = 'running'

        const deleteList = []
        for (const item of items) {
          await this.buildDeleteList(cameraApi, item, deleteList)
        }

        task.total = deleteList.length
        if (task.total === 0) {
          task.status = 'completed'
          task.completed = 0
          return
        }

        for (const target of deleteList) {
          try {
            await cameraApi.deleteFile(target.path)
          } catch (error) {
            // If deleting directory entry fails, continue
            if (target.isDir) {
              continue
            }
            task.status = 'failed'
            task.error_message = error.message
            return
          }

          task.completed += 1
        }

        task.status = 'completed'
      } catch (error) {
        task.status = 'failed'
        task.error_message = error.message
      }
    })

    return task
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null
  }

  getActiveTask() {
    if (this.activeTaskId && this.tasks.has(this.activeTaskId)) {
      const task = this.tasks.get(this.activeTaskId)
      if (task && (task.status === 'running' || task.status === 'preparing')) {
        return task
      }
    }

    // Fallback: find any running task
    for (const task of this.tasks.values()) {
      if (task.status === 'running' || task.status === 'preparing') {
        return task
      }
    }

    return null
  }
}

export default new DeleteService()
