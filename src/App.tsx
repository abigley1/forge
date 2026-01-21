import { AppShell } from '@/components/layout'
import { Button, Dialog } from '@/components/ui'

function App() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome to Forge
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select a project or create a new one to get started.
        </p>

        {/* Example Dialog usage - demonstrates Base UI integration */}
        <Dialog.Root>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="My Hardware Project"
                  autoComplete="off"
                />
              </div>
              <Dialog.Footer>
                <Dialog.Close>Cancel</Dialog.Close>
                <Button>Create</Button>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </AppShell>
  )
}

export default App
