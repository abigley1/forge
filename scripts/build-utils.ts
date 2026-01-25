/**
 * Build utilities for production builds
 * Generates version.json with build metadata
 */
import { execSync } from 'child_process'

export interface VersionInfo {
  version: string
  buildTimestamp: string
  gitHash: string
  gitHashFull: string
  gitBranch: string
  buildEnvironment: 'production' | 'development'
}

/**
 * Get the current git commit hash (short form)
 */
export function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get the current git commit hash (full form)
 */
export function getGitHashFull(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get the current git branch name
 */
export function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Generate version info object for build
 */
export function generateVersionInfo(
  packageVersion: string,
  isProduction: boolean = true
): VersionInfo {
  return {
    version: packageVersion,
    buildTimestamp: new Date().toISOString(),
    gitHash: getGitHash(),
    gitHashFull: getGitHashFull(),
    gitBranch: getGitBranch(),
    buildEnvironment: isProduction ? 'production' : 'development',
  }
}

/**
 * Generate version.json content as a string
 */
export function generateVersionJson(
  packageVersion: string,
  isProduction: boolean = true
): string {
  const versionInfo = generateVersionInfo(packageVersion, isProduction)
  return JSON.stringify(versionInfo, null, 2)
}
