import { useState } from 'react'
import { AppShell } from '@/components/layout'
import { Button, Dialog } from '@/components/ui'
import { useProjectStore, useNodesStore } from '@/store'
import { BrowserFileSystemAdapter } from '@/lib/filesystem/BrowserFileSystemAdapter'
import { initializeProject, slugify } from '@/lib/project'

function App() {
  const [projectName, setProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setAdapter = useProjectStore((state) => state.setAdapter)

  const handleCreate = async () => {
    if (!projectName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const adapter = new BrowserFileSystemAdapter()
      await adapter.requestDirectoryAccess()

      const rootPath = adapter.getRootPath()
      const projectPath = `${rootPath}/${slugify(projectName)}`

      const project = await initializeProject(
        adapter,
        projectPath,
        projectName.trim()
      )

      setAdapter(adapter)
      useProjectStore.setState({
        project,
        isDirty: false,
        error: null,
        parseErrors: [],
      })
      useNodesStore.getState().setNodes(project.nodes)

      setDialogOpen(false)
      setProjectName('')
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === 'User cancelled directory selection'
      ) {
        // User cancelled - not an error
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome to Forge
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select a project or create a new one to get started.
        </p>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger>Create New Project</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Title>Create New Project</Dialog.Title>
              <Dialog.Description>
                Enter a name for your new project. You can change this later.
              </Dialog.Description>
              <div className="mt-4">
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectName.trim()) {
                      handleCreate()
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="My Hardware Project"
                  autoComplete="off"
                  disabled={isCreating}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
              <Dialog.Footer>
                <Dialog.Close disabled={isCreating}>Cancel</Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={!projectName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AppShell>
  )
}

export default App
