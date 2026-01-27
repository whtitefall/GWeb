import type { GraphPayload } from './graphTypes'

export const STORAGE_GRAPH_PREFIX = 'gweb.graph.data.v1.'
export const STORAGE_LIST_KEY = 'gweb.graph.list.v1'
export const STORAGE_ACTIVE_KEY = 'gweb.graph.active.v1'
export const THEME_KEY = 'gweb.theme.v1'
export const ACCENT_KEY = 'gweb.accent.v1'

export const GROUP_PADDING = 32
export const DEFAULT_GROUP_SIZE = { width: 300, height: 180 }
export const DEFAULT_NODE_SIZE = { width: 150, height: 52 }
export const SIDEBAR_MIN = 200
export const SIDEBAR_MAX = 420
export const SIDEBAR_COLLAPSED = 220
export const DRAWER_MIN = 280
export const DRAWER_MAX = 900

export const ACCENT_OPTIONS = [
  {
    id: 'blue',
    label: 'Blue',
    accent: '#5b7cfa',
    accentStrong: '#3f65f0',
    nodeFill: '#2d3f9b',
    nodeBorder: 'rgba(91, 124, 250, 0.55)',
  },
  {
    id: 'teal',
    label: 'Teal',
    accent: '#2ec4ff',
    accentStrong: '#1a9fd6',
    nodeFill: '#1a3b4a',
    nodeBorder: 'rgba(46, 196, 255, 0.5)',
  },
  {
    id: 'purple',
    label: 'Purple',
    accent: '#8b5cf6',
    accentStrong: '#6d3df0',
    nodeFill: '#3a2a6d',
    nodeBorder: 'rgba(139, 92, 246, 0.5)',
  },
  {
    id: 'orange',
    label: 'Orange',
    accent: '#f59f5a',
    accentStrong: '#e07d33',
    nodeFill: '#5a3721',
    nodeBorder: 'rgba(245, 159, 90, 0.5)',
  },
] as const

export const defaultGraph: GraphPayload = {
  name: 'Starter Graph',
  nodes: [
    {
      id: 'group-1',
      type: 'group',
      position: { x: 140, y: 120 },
      data: {
        label: 'Core Cluster',
        position3d: { x: 60, y: 40, z: -40 },
        items: [],
      },
      style: {
        width: 300,
        height: 180,
      },
    },
    {
      id: 'node-1',
      type: 'default',
      position: { x: 24, y: 36 },
      parentNode: 'group-1',
      extent: 'parent' as const,
      data: {
        label: 'Launch Plan',
        position3d: { x: -40, y: -20, z: 40 },
        items: [
          {
            id: 'item-1',
            title: 'Visual theme',
            notes: [{ id: 'note-1', title: 'Finalize palette' }],
          },
          {
            id: 'item-2',
            title: 'Demo flow',
            notes: [{ id: 'note-2', title: 'Storyboard walkthrough' }],
          },
        ],
      },
    },
    {
      id: 'node-2',
      type: 'default',
      position: { x: 140, y: 90 },
      parentNode: 'group-1',
      extent: 'parent' as const,
      data: {
        label: 'User Research',
        position3d: { x: 40, y: 20, z: -20 },
        items: [
          {
            id: 'item-3',
            title: 'Interviews',
            notes: [{ id: 'note-3', title: 'Schedule 3 sessions' }],
          },
        ],
      },
    },
    {
      id: 'node-3',
      type: 'default',
      position: { x: 560, y: 200 },
      data: {
        label: 'Prototype Sprint',
        position3d: { x: 120, y: 60, z: 60 },
        items: [
          {
            id: 'item-4',
            title: 'Interaction map',
            notes: [{ id: 'note-4', title: 'Map interactions' }],
          },
          {
            id: 'item-5',
            title: 'Storyboard',
            notes: [{ id: 'note-5', title: 'Storyboard flow' }],
          },
        ],
      },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'smoothstep',
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3',
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

export const SOLAR_SYSTEM_GRAPH: GraphPayload = {
  name: 'Solar System',
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
