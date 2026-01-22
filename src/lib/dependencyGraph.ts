/**
 * Dependency Graph - DAG data structure for managing task dependencies
 *
 * Provides cycle detection and topological sorting for task dependency management.
 * Edges represent "depends on" relationships: if A -> B, then A depends on B
 * (B must complete before A can start).
 */

/**
 * Represents an edge in the dependency graph
 */
export interface DependencyEdge {
  /** The node that depends on another (the dependent) */
  from: string
  /** The node being depended on (the dependency) */
  to: string
}

/**
 * Result of a cycle detection check
 */
export interface CycleCheckResult {
  /** Whether adding the edge would create a cycle */
  wouldCreateCycle: boolean
  /** If a cycle would be created, the path of nodes forming the cycle */
  cyclePath?: string[]
}

/**
 * Error thrown when attempting to create a cycle in the DAG
 */
export class CycleError extends Error {
  readonly cyclePath: string[]

  constructor(cyclePath: string[], message?: string) {
    super(message || `Cycle detected: ${cyclePath.join(' -> ')}`)
    this.name = 'CycleError'
    this.cyclePath = cyclePath
  }
}

/**
 * DependencyGraph - A directed acyclic graph (DAG) for managing dependencies
 *
 * Uses adjacency lists for efficient traversal. The graph is maintained as a DAG,
 * rejecting any edge additions that would create a cycle.
 */
export class DependencyGraph {
  /** Set of all node IDs in the graph */
  private nodes: Set<string> = new Set()

  /** Adjacency list: nodeId -> Set of nodes it depends on (outgoing edges) */
  private outgoing: Map<string, Set<string>> = new Map()

  /** Reverse adjacency list: nodeId -> Set of nodes that depend on it (incoming edges) */
  private incoming: Map<string, Set<string>> = new Map()

  /**
   * Creates an empty dependency graph or copies from an existing one
   */
  constructor(other?: DependencyGraph) {
    if (other) {
      this.nodes = new Set(other.nodes)
      for (const [key, value] of other.outgoing) {
        this.outgoing.set(key, new Set(value))
      }
      for (const [key, value] of other.incoming) {
        this.incoming.set(key, new Set(value))
      }
    }
  }

  /**
   * Adds a node to the graph
   * @param nodeId - The ID of the node to add
   * @returns true if the node was added, false if it already existed
   */
  addNode(nodeId: string): boolean {
    if (this.nodes.has(nodeId)) {
      return false
    }
    this.nodes.add(nodeId)
    this.outgoing.set(nodeId, new Set())
    this.incoming.set(nodeId, new Set())
    return true
  }

  /**
   * Removes a node and all its edges from the graph
   * @param nodeId - The ID of the node to remove
   * @returns true if the node was removed, false if it didn't exist
   */
  removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) {
      return false
    }

    // Remove all outgoing edges from this node
    const dependencies = this.outgoing.get(nodeId)
    if (dependencies) {
      for (const depId of dependencies) {
        this.incoming.get(depId)?.delete(nodeId)
      }
    }

    // Remove all incoming edges to this node
    const dependents = this.incoming.get(nodeId)
    if (dependents) {
      for (const depId of dependents) {
        this.outgoing.get(depId)?.delete(nodeId)
      }
    }

    this.nodes.delete(nodeId)
    this.outgoing.delete(nodeId)
    this.incoming.delete(nodeId)

    return true
  }

  /**
   * Checks if a node exists in the graph
   * @param nodeId - The ID of the node to check
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId)
  }

  /**
   * Gets all node IDs in the graph
   */
  getNodes(): string[] {
    return Array.from(this.nodes)
  }

  /**
   * Gets the number of nodes in the graph
   */
  get nodeCount(): number {
    return this.nodes.size
  }

  /**
   * Adds a directed edge (dependency) from one node to another
   *
   * @param fromId - The dependent node (the one that depends on another)
   * @param toId - The dependency node (the one being depended on)
   * @param validateCycle - If true, throws CycleError if this would create a cycle
   * @returns true if the edge was added, false if it already existed
   * @throws CycleError if validateCycle is true and adding this edge would create a cycle
   */
  addEdge(fromId: string, toId: string, validateCycle = true): boolean {
    // Self-loops are never allowed
    if (fromId === toId) {
      if (validateCycle) {
        throw new CycleError(
          [fromId, toId],
          `Self-dependency not allowed: ${fromId}`
        )
      }
      return false
    }

    // Ensure both nodes exist
    this.addNode(fromId)
    this.addNode(toId)

    // Check if edge already exists
    if (this.outgoing.get(fromId)?.has(toId)) {
      return false
    }

    // Check for cycles if validation is enabled
    if (validateCycle) {
      const cycleCheck = this.checkCycle(fromId, toId)
      if (cycleCheck.wouldCreateCycle) {
        throw new CycleError(
          cycleCheck.cyclePath || [fromId, toId],
          `Adding edge ${fromId} -> ${toId} would create a cycle`
        )
      }
    }

    // Add the edge
    this.outgoing.get(fromId)!.add(toId)
    this.incoming.get(toId)!.add(fromId)

    return true
  }

  /**
   * Removes a directed edge from the graph
   * @param fromId - The dependent node
   * @param toId - The dependency node
   * @returns true if the edge was removed, false if it didn't exist
   */
  removeEdge(fromId: string, toId: string): boolean {
    const outSet = this.outgoing.get(fromId)
    const inSet = this.incoming.get(toId)

    if (!outSet?.has(toId)) {
      return false
    }

    outSet.delete(toId)
    inSet?.delete(fromId)

    return true
  }

  /**
   * Checks if an edge exists in the graph
   * @param fromId - The dependent node
   * @param toId - The dependency node
   */
  hasEdge(fromId: string, toId: string): boolean {
    return this.outgoing.get(fromId)?.has(toId) ?? false
  }

  /**
   * Gets all edges in the graph
   */
  getEdges(): DependencyEdge[] {
    const edges: DependencyEdge[] = []
    for (const [from, toSet] of this.outgoing) {
      for (const to of toSet) {
        edges.push({ from, to })
      }
    }
    return edges
  }

  /**
   * Gets the number of edges in the graph
   */
  get edgeCount(): number {
    let count = 0
    for (const toSet of this.outgoing.values()) {
      count += toSet.size
    }
    return count
  }

  /**
   * Gets the nodes that a given node depends on (outgoing edges)
   * @param nodeId - The node to get dependencies for
   */
  getDependencies(nodeId: string): string[] {
    return Array.from(this.outgoing.get(nodeId) ?? [])
  }

  /**
   * Gets the nodes that depend on a given node (incoming edges)
   * @param nodeId - The node to get dependents for
   */
  getDependents(nodeId: string): string[] {
    return Array.from(this.incoming.get(nodeId) ?? [])
  }

  /**
   * Checks if adding an edge would create a cycle using DFS
   *
   * Uses depth-first search starting from the target node (toId) to see
   * if we can reach the source node (fromId). If we can, adding the edge
   * fromId -> toId would create a cycle.
   *
   * @param fromId - The source node of the potential new edge
   * @param toId - The target node of the potential new edge
   * @returns CycleCheckResult indicating if a cycle would be created
   */
  checkCycle(fromId: string, toId: string): CycleCheckResult {
    // Self-loop is always a cycle
    if (fromId === toId) {
      return { wouldCreateCycle: true, cyclePath: [fromId, toId] }
    }

    // If toId doesn't exist yet, no cycle possible
    if (!this.nodes.has(toId)) {
      return { wouldCreateCycle: false }
    }

    // DFS from toId to see if we can reach fromId
    // If we can, then adding fromId -> toId creates: fromId -> toId -> ... -> fromId
    const visited = new Set<string>()
    const path: string[] = []

    const dfs = (current: string): boolean => {
      if (current === fromId) {
        // Found a path from toId to fromId, so adding fromId -> toId creates a cycle
        path.push(current)
        return true
      }

      if (visited.has(current)) {
        return false
      }

      visited.add(current)
      path.push(current)

      // Follow outgoing edges (dependencies)
      const dependencies = this.outgoing.get(current)
      if (dependencies) {
        for (const dep of dependencies) {
          if (dfs(dep)) {
            return true
          }
        }
      }

      path.pop()
      return false
    }

    if (dfs(toId)) {
      // Construct the full cycle path: fromId -> toId -> ... -> fromId
      const cyclePath = [fromId, ...path]
      return { wouldCreateCycle: true, cyclePath }
    }

    return { wouldCreateCycle: false }
  }

  /**
   * Creates a copy of this graph
   */
  clone(): DependencyGraph {
    return new DependencyGraph(this)
  }

  /**
   * Clears all nodes and edges from the graph
   */
  clear(): void {
    this.nodes.clear()
    this.outgoing.clear()
    this.incoming.clear()
  }

  /**
   * Checks if the graph is empty (no nodes)
   */
  isEmpty(): boolean {
    return this.nodes.size === 0
  }
}

/**
 * Checks if adding an edge would create a cycle in the graph
 *
 * This is a standalone function that wraps the DependencyGraph.checkCycle method
 * for convenience when working with an existing graph.
 *
 * @param graph - The dependency graph to check
 * @param fromId - The source node of the potential new edge
 * @param toId - The target node of the potential new edge
 * @returns true if adding the edge would create a cycle
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  fromId: string,
  toId: string
): boolean {
  return graph.checkCycle(fromId, toId).wouldCreateCycle
}

/**
 * Result of a topological sort
 */
export interface TopologicalSortResult {
  /** Whether the sort was successful (graph is a valid DAG) */
  success: boolean
  /** The sorted node IDs (dependency order - dependencies come before dependents) */
  sorted: string[]
  /** If the graph has a cycle, the nodes involved in the cycle */
  cycle?: string[]
}

/**
 * Performs a topological sort on the dependency graph using Kahn's algorithm
 *
 * Returns nodes in dependency order: if A depends on B, B will appear before A
 * in the sorted result. Handles disconnected subgraphs correctly.
 *
 * @param graph - The dependency graph to sort
 * @returns TopologicalSortResult with sorted nodes or cycle information
 */
export function topologicalSort(graph: DependencyGraph): TopologicalSortResult {
  if (graph.isEmpty()) {
    return { success: true, sorted: [] }
  }

  // Create working copies of in-degree counts
  const inDegree = new Map<string, number>()
  const nodes = graph.getNodes()

  for (const node of nodes) {
    // In-degree is the number of dependencies (outgoing edges for the node)
    // Wait, we need to think about this more carefully...
    //
    // In our graph:
    // - outgoing[A] = nodes that A depends on
    // - incoming[A] = nodes that depend on A
    //
    // For topological sort, we want dependencies before dependents
    // So a node can be processed when all its dependencies are processed
    // That means: in-degree = number of dependencies = outgoing.size
    //
    // Actually, let's reconsider. In a standard topological sort:
    // - We process nodes with no incoming edges first
    // - In our case, "incoming" edges are nodes that depend on this node
    // - "outgoing" edges are nodes this node depends on
    //
    // For dependency order (deps before dependents):
    // - Process nodes with no outgoing edges first (no dependencies)
    // - Then process nodes whose dependencies are all processed
    //
    // This is like reversing the standard algorithm
    inDegree.set(node, graph.getDependencies(node).length)
  }

  // Queue of nodes with no dependencies (can be processed immediately)
  const queue: string[] = []
  for (const node of nodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node)
    }
  }

  const sorted: string[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)

    // For each node that depends on this one, decrement their "pending dependency" count
    for (const dependent of graph.getDependents(node)) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, newDegree)
      if (newDegree === 0) {
        queue.push(dependent)
      }
    }
  }

  // Check if we processed all nodes
  if (sorted.length !== nodes.length) {
    // There's a cycle - find the nodes involved
    const cycle = nodes.filter((node) => (inDegree.get(node) ?? 0) > 0)
    return { success: false, sorted: [], cycle }
  }

  return { success: true, sorted }
}

/**
 * Builds a DependencyGraph from a collection of nodes with dependency information
 *
 * @param dependencies - Map or object of nodeId -> array of dependency IDs
 * @returns A new DependencyGraph populated with the dependencies
 */
export function buildDependencyGraph(
  dependencies: Map<string, string[]> | Record<string, string[]>
): DependencyGraph {
  const graph = new DependencyGraph()

  const entries =
    dependencies instanceof Map
      ? dependencies.entries()
      : Object.entries(dependencies)

  for (const [nodeId, deps] of entries) {
    graph.addNode(nodeId)
    for (const depId of deps) {
      // Add edge with cycle validation - throws CycleError if a cycle is detected
      try {
        graph.addEdge(nodeId, depId, true)
      } catch (e) {
        if (e instanceof CycleError) {
          // Re-throw with more context
          throw new CycleError(
            e.cyclePath,
            `Cycle detected while building graph: ${e.cyclePath.join(' -> ')}`
          )
        }
        throw e
      }
    }
  }

  return graph
}

/**
 * Gets all nodes that a given node transitively depends on (all ancestors)
 *
 * @param graph - The dependency graph
 * @param nodeId - The node to get transitive dependencies for
 * @returns Set of all node IDs that this node directly or indirectly depends on
 */
export function getTransitiveDependencies(
  graph: DependencyGraph,
  nodeId: string
): Set<string> {
  const result = new Set<string>()
  const visited = new Set<string>()
  const stack = [nodeId]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)

    for (const dep of graph.getDependencies(current)) {
      result.add(dep)
      if (!visited.has(dep)) {
        stack.push(dep)
      }
    }
  }

  return result
}

/**
 * Gets all nodes that transitively depend on a given node (all descendants)
 *
 * @param graph - The dependency graph
 * @param nodeId - The node to get transitive dependents for
 * @returns Set of all node IDs that directly or indirectly depend on this node
 */
export function getTransitiveDependents(
  graph: DependencyGraph,
  nodeId: string
): Set<string> {
  const result = new Set<string>()
  const visited = new Set<string>()
  const stack = [nodeId]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)

    for (const dependent of graph.getDependents(current)) {
      result.add(dependent)
      if (!visited.has(dependent)) {
        stack.push(dependent)
      }
    }
  }

  return result
}
