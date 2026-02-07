// Shared constants for storage keys, sizing, theme accents, and starter content.
import type { GraphPayload } from './graphTypes'

export const STORAGE_GRAPH_PREFIX = 'gweb.graph.data.v1.'
export const STORAGE_LIST_KEY = 'gweb.graph.list.v1'
export const STORAGE_ACTIVE_KEY = 'gweb.graph.active.v1'
export const THEME_KEY = 'gweb.theme.v1'
export const ACCENT_KEY = 'gweb.accent.v1'
export const MINIMAP_KEY = 'gweb.minimap.v1'
export const BETA_KEY = 'gweb.beta.features.v1'
export const NODE_DETAILS_LAYOUT_KEY = 'gweb.node.details.layout.v1'
export const AI_PROVIDER_KEY = 'gweb.ai.provider.v1'

export const GROUP_PADDING = 32
export const DEFAULT_GROUP_SIZE = { width: 300, height: 180 }
export const DEFAULT_NODE_SIZE = { width: 150, height: 52 }
export const SIDEBAR_MIN = 200
export const SIDEBAR_MAX = 420
export const SIDEBAR_COLLAPSED = 64
export const DRAWER_MIN = 280
export const DRAWER_MAX = 900

export const ACCENT_OPTIONS = [
  {
    id: 'blue',
    label: 'Blue',
    accent: '#5b7cfa',
    accentStrong: '#3f65f0',
    nodeFill: '#314d9a',
    nodeFillLight: '#e7edff',
    nodeBorder: 'rgba(91, 124, 250, 0.42)',
    nodeBorderLight: 'rgba(91, 124, 250, 0.34)',
  },
  {
    id: 'teal',
    label: 'Teal',
    accent: '#2ec4ff',
    accentStrong: '#1a9fd6',
    nodeFill: '#1f4d5f',
    nodeFillLight: '#e4f7ff',
    nodeBorder: 'rgba(46, 196, 255, 0.4)',
    nodeBorderLight: 'rgba(46, 196, 255, 0.32)',
  },
  {
    id: 'purple',
    label: 'Purple',
    accent: '#8b5cf6',
    accentStrong: '#6d3df0',
    nodeFill: '#4a3d7a',
    nodeFillLight: '#eee7ff',
    nodeBorder: 'rgba(139, 92, 246, 0.4)',
    nodeBorderLight: 'rgba(139, 92, 246, 0.32)',
  },
  {
    id: 'orange',
    label: 'Orange',
    accent: '#f59f5a',
    accentStrong: '#e07d33',
    nodeFill: '#65462f',
    nodeFillLight: '#fff0e5',
    nodeBorder: 'rgba(245, 159, 90, 0.4)',
    nodeBorderLight: 'rgba(245, 159, 90, 0.32)',
  },
] as const

// Starter Graph Notes payload used for first-time users.
export const defaultGraph: GraphPayload = {
  name: 'Graph Roadmap',
  kind: 'note',
  nodes: [
    {
      id: 'starter-arrays',
      type: 'default',
      position: { x: 470, y: 40 },
      data: { label: 'Arrays & Hashing', items: [] },
    },
    {
      id: 'starter-two-pointers',
      type: 'default',
      position: { x: 330, y: 170 },
      data: { label: 'Two Pointers', items: [] },
    },
    {
      id: 'starter-stack',
      type: 'default',
      position: { x: 610, y: 170 },
      data: { label: 'Stack', items: [] },
    },
    {
      id: 'starter-binary-search',
      type: 'default',
      position: { x: 190, y: 300 },
      data: { label: 'Binary Search', items: [] },
    },
    {
      id: 'starter-sliding-window',
      type: 'default',
      position: { x: 420, y: 300 },
      data: { label: 'Sliding Window', items: [] },
    },
    {
      id: 'starter-linked-list',
      type: 'default',
      position: { x: 650, y: 300 },
      data: { label: 'Linked List', items: [] },
    },
    {
      id: 'starter-trees',
      type: 'default',
      position: { x: 420, y: 430 },
      data: { label: 'Trees', items: [] },
    },
    {
      id: 'starter-tries',
      type: 'default',
      position: { x: 90, y: 560 },
      data: { label: 'Tries', items: [] },
    },
    {
      id: 'starter-heap',
      type: 'default',
      position: { x: 420, y: 560 },
      data: { label: 'Heap / Priority Queue', items: [] },
    },
    {
      id: 'starter-backtracking',
      type: 'default',
      position: { x: 760, y: 560 },
      data: { label: 'Backtracking', items: [] },
    },
    {
      id: 'starter-graphs',
      type: 'default',
      position: { x: 640, y: 690 },
      data: { label: 'Graphs', items: [] },
    },
    {
      id: 'starter-1d-dp',
      type: 'default',
      position: { x: 900, y: 690 },
      data: { label: '1-D DP', items: [] },
    },
    {
      id: 'starter-intervals',
      type: 'default',
      position: { x: 90, y: 820 },
      data: { label: 'Intervals', items: [] },
    },
    {
      id: 'starter-greedy',
      type: 'default',
      position: { x: 280, y: 820 },
      data: { label: 'Greedy', items: [] },
    },
    {
      id: 'starter-advanced-graphs',
      type: 'default',
      position: { x: 500, y: 820 },
      data: { label: 'Advanced Graphs', items: [] },
    },
    {
      id: 'starter-2d-dp',
      type: 'default',
      position: { x: 740, y: 820 },
      data: { label: '2-D DP', items: [] },
    },
    {
      id: 'starter-bit-manipulation',
      type: 'default',
      position: { x: 940, y: 820 },
      data: { label: 'Bit Manipulation', items: [] },
    },
    {
      id: 'starter-math-geometry',
      type: 'default',
      position: { x: 740, y: 950 },
      data: { label: 'Math & Geometry', items: [] },
    },
  ],
  edges: [
    {
      id: 'starter-e1',
      source: 'starter-arrays',
      target: 'starter-two-pointers',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e2',
      source: 'starter-arrays',
      target: 'starter-stack',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e3',
      source: 'starter-two-pointers',
      target: 'starter-binary-search',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e4',
      source: 'starter-two-pointers',
      target: 'starter-sliding-window',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e5',
      source: 'starter-two-pointers',
      target: 'starter-linked-list',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e6',
      source: 'starter-binary-search',
      target: 'starter-trees',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e7',
      source: 'starter-sliding-window',
      target: 'starter-trees',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e8',
      source: 'starter-linked-list',
      target: 'starter-trees',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e9',
      source: 'starter-trees',
      target: 'starter-tries',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e10',
      source: 'starter-trees',
      target: 'starter-heap',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e11',
      source: 'starter-trees',
      target: 'starter-backtracking',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e12',
      source: 'starter-backtracking',
      target: 'starter-graphs',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e13',
      source: 'starter-backtracking',
      target: 'starter-1d-dp',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e14',
      source: 'starter-heap',
      target: 'starter-intervals',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e15',
      source: 'starter-heap',
      target: 'starter-greedy',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e16',
      source: 'starter-heap',
      target: 'starter-advanced-graphs',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e17',
      source: 'starter-graphs',
      target: 'starter-advanced-graphs',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e18',
      source: 'starter-graphs',
      target: 'starter-2d-dp',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e19',
      source: 'starter-1d-dp',
      target: 'starter-bit-manipulation',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e20',
      source: 'starter-1d-dp',
      target: 'starter-2d-dp',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e21',
      source: 'starter-2d-dp',
      target: 'starter-math-geometry',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
    {
      id: 'starter-e22',
      source: 'starter-bit-manipulation',
      target: 'starter-math-geometry',
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
      type: 'smoothstep',
    },
  ],
}

const SOLAR_SYSTEM_POSITIONS = [
  { id: 'sun', label: 'Sun', radius: 0, angle: 0, z: 0 },
  { id: 'mercury', label: 'Mercury', radius: 120, angle: 20, z: 10 },
  { id: 'venus', label: 'Venus', radius: 180, angle: 60, z: -10 },
  { id: 'earth', label: 'Earth', radius: 240, angle: 110, z: 14 },
  { id: 'mars', label: 'Mars', radius: 300, angle: 150, z: -8 },
  { id: 'jupiter', label: 'Jupiter', radius: 380, angle: 200, z: 22 },
  { id: 'saturn', label: 'Saturn', radius: 460, angle: 250, z: -18 },
  { id: 'uranus', label: 'Uranus', radius: 540, angle: 300, z: 16 },
  { id: 'neptune', label: 'Neptune', radius: 620, angle: 340, z: -12 },
] as const

// Reserved for future/beta 3D graph view (not wired by default).
export const SOLAR_SYSTEM_GRAPH: GraphPayload = {
  name: 'Solar System',
  kind: 'graph3d',
  nodes: SOLAR_SYSTEM_POSITIONS.map((planet, index) => {
    const radians = (planet.angle * Math.PI) / 180
    const x = Math.cos(radians) * planet.radius
    const y = Math.sin(radians) * planet.radius
    return {
      id: planet.id,
      type: 'default',
      position: { x, y },
      data: {
        label: planet.label,
        position3d: {
          x: planet.radius,
          y: planet.z,
          z: index * 30,
        },
        items: [],
      },
    }
  }),
  edges: SOLAR_SYSTEM_POSITIONS.filter((planet) => planet.id !== 'sun').map((planet) => ({
    id: `edge-${planet.id}`,
    source: 'sun',
    target: planet.id,
    type: 'smoothstep',
  })),
}

export const QUICK_FACTS = [
  {
    key: 'vertices',
    title: 'Vertices + Edges',
    detail: 'A graph is made of vertices (nodes) and edges (links) that connect them.',
    long: 'Vertices represent entities and edges represent relationships. Once you know the set of vertices and how they connect, you can analyze structure, reachability, and flow through the network.',
  },
  {
    key: 'directed',
    title: 'Directed vs Undirected',
    detail: 'Directed graphs have arrows on edges, undirected graphs do not.',
    long: 'Directed graphs encode one-way relationships (like followers or prerequisites). Undirected graphs encode mutual relationships (like friendships). The choice impacts traversal and connectivity.',
  },
  {
    key: 'trees',
    title: 'Trees',
    detail: 'A tree is a connected, acyclic graph with exactly n-1 edges.',
    long: 'Trees are hierarchical graphs with no cycles. They are efficient for representing parent-child relationships and allow unique paths between any two nodes.',
  },
  {
    key: 'shortest',
    title: 'Shortest Paths',
    detail: 'BFS solves unweighted shortest paths; Dijkstra handles weighted edges.',
    long: 'Shortest-path algorithms find the minimal-cost route between nodes. BFS works in layers for unweighted graphs, while Dijkstra expands outward using cumulative weights.',
  },
  {
    key: 'coloring',
    title: 'Graph Coloring',
    detail: 'Coloring assigns labels so adjacent nodes never share the same color.',
    long: 'Graph coloring is used to minimize conflicts, such as scheduling tasks without overlaps or assigning frequencies to radio towers to avoid interference.',
  },
  {
    key: 'planar',
    title: 'Planar Graphs',
    detail: 'Planar graphs can be drawn without any edges crossing.',
    long: 'A planar graph can be embedded in the plane without edge intersections. Planarity matters for circuit design, map coloring, and layout readability.',
  },
] as const

export type QuickFactKey = (typeof QUICK_FACTS)[number]['key']

export const statusLabels = {
  idle: 'Idle',
  saving: 'Saving...',
  saved: 'Synced',
  offline: 'Local only',
} as const
