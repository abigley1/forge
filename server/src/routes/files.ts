import { Router, type Request, type Response, type NextFunction } from 'express'
import {
  ServerFileSystemAdapter,
  FileNotFoundError,
  DirectoryNotFoundError,
  InvalidPathError,
  PermissionDeniedError,
} from '../adapters/ServerFileSystemAdapter.js'

interface FileResponse {
  path: string
  content: string
}

interface DirectoryResponse {
  path: string
  entries: Array<{
    name: string
    path: string
    isDirectory: boolean
    isFile: boolean
  }>
}

interface ErrorResponse {
  error: string
  code: string
  path?: string
}

/**
 * Create file operations router
 */
export function createFilesRouter(adapter: ServerFileSystemAdapter): Router {
  const router = Router()

  /**
   * Error handling middleware for file system errors
   */
  function handleFileSystemError(
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (error instanceof FileNotFoundError) {
      res.status(404).json({
        error: error.message,
        code: 'FILE_NOT_FOUND',
        path: error.path,
      } satisfies ErrorResponse)
      return
    }

    if (error instanceof DirectoryNotFoundError) {
      res.status(404).json({
        error: error.message,
        code: 'DIRECTORY_NOT_FOUND',
        path: error.path,
      } satisfies ErrorResponse)
      return
    }

    if (error instanceof InvalidPathError) {
      res.status(400).json({
        error: error.message,
        code: 'INVALID_PATH',
        path: error.path,
      } satisfies ErrorResponse)
      return
    }

    if (error instanceof PermissionDeniedError) {
      res.status(403).json({
        error: error.message,
        code: 'PERMISSION_DENIED',
        path: error.path,
      } satisfies ErrorResponse)
      return
    }

    // Pass to default error handler
    next(error)
  }

  /**
   * Extract file path from request params
   * Handles both root (/) and subpaths
   */
  function getFilePath(req: Request): string {
    // In Express 5, the wildcard param is named 'path' from '/*path' pattern
    // For root route '/', params.path is undefined
    // For wildcard routes, Express 5 returns an array of path segments
    const pathParam = req.params.path
    if (!pathParam) {
      return '/'
    }
    // Handle Express 5 array params from wildcard routes
    if (Array.isArray(pathParam)) {
      return '/' + pathParam.join('/')
    }
    // Handle string param (shouldn't happen in Express 5, but just in case)
    return pathParam.startsWith('/') ? pathParam : '/' + pathParam
  }

  /**
   * GET handler for reading files or listing directories
   */
  async function handleGet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filePath = getFilePath(req)
      const shouldList = req.query.list === 'true'
      const recursive = req.query.recursive === 'true'

      if (shouldList) {
        // List directory contents
        const entries = await adapter.listDirectory(filePath, { recursive })
        res.json({
          path: filePath,
          entries,
        } satisfies DirectoryResponse)
      } else {
        // Read file contents
        const content = await adapter.readFile(filePath)
        res.json({
          path: filePath,
          content,
        } satisfies FileResponse)
      }
    } catch (error) {
      handleFileSystemError(error, req, res, next)
    }
  }

  /**
   * PUT handler for writing files
   */
  async function handlePut(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filePath = getFilePath(req)

      if (!req.body || typeof req.body.content !== 'string') {
        res.status(400).json({
          error:
            'Request body must contain a "content" field with string value',
          code: 'INVALID_BODY',
        } satisfies ErrorResponse)
        return
      }

      const { content } = req.body as { content: string }

      // Check if file exists (for response status)
      const exists = await adapter.exists(filePath)

      await adapter.writeFile(filePath, content)

      res.status(exists ? 200 : 201).json({
        path: filePath,
        content,
      } satisfies FileResponse)
    } catch (error) {
      handleFileSystemError(error, req, res, next)
    }
  }

  /**
   * DELETE handler for removing files or directories
   */
  async function handleDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filePath = getFilePath(req)
      const recursive = req.query.recursive === 'true'

      await adapter.delete(filePath, recursive)

      res.status(204).send()
    } catch (error) {
      handleFileSystemError(error, req, res, next)
    }
  }

  // Register routes for root path
  router.get('/', handleGet)
  router.put('/', handlePut)
  router.delete('/', handleDelete)

  // Register routes for subpaths (Express 5 wildcard syntax)
  router.get('/*path', handleGet)
  router.put('/*path', handlePut)
  router.delete('/*path', handleDelete)

  return router
}
