import React, { useEffect } from 'react'
import ReactFlow, { Background, Controls, MiniMap, Connection, Edge, Node, OnConnect, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { World } from '../types/world'

type Props = {
  world: World
  positions: Record<string, { x: number, y: number }>
  onPositionsChange: (pos: Record<string, { x: number, y: number }>) => void
  onConnectPlaces: (sourceId: string, targetId: string) => void
  onNodeDoubleClick: (placeId: string) => void
  onEdgeDoubleClick: (placeA: string, placeB: string) => void
}

export default function GraphView({ world, positions, onPositionsChange, onConnectPlaces, onNodeDoubleClick, onEdgeDoubleClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    const nextNodes: Node[] = Object.entries(world.place_defs).map(([pid, p], idx) => ({
      id: pid,
      position: positions[pid] ?? { x: 80 + (idx * 140) % 560, y: 80 + Math.floor(idx / 4) * 120 },
      data: { label: p.callnames?.[0] ?? pid.replace(/^p_/, '') },
      type: 'default'
    }))
    setNodes(nextNodes)
  }, [world, positions, setNodes])

  useEffect(() => {
    // Draw ONE line per pair of places. A connection is bidirectional iff ways exist
    // for both directions; then it's white. A one-way connection is orange (arrow shows
    // the direction). Labels are omitted to keep the graph readable — double-click an
    // edge to edit both directions.
    const has = new Set(Object.values(world.way_defs).map(w => `${w.source} ${w.destination}`))
    const seen = new Set<string>()
    const nextEdges: Edge[] = []
    for (const w of Object.values(world.way_defs)) {
      const [lo, hi] = w.source < w.destination ? [w.source, w.destination] : [w.destination, w.source]
      const key = `${lo} ${hi}`
      if (seen.has(key)) continue
      seen.add(key)
      const bidi = has.has(`${lo} ${hi}`) && has.has(`${hi} ${lo}`)
      nextEdges.push({
        id: `pair:${key}`,
        // For one-way, orient the arrow along the existing direction (w.source -> w.destination).
        source: bidi ? lo : w.source,
        target: bidi ? hi : w.destination,
        type: 'default',
        data: { placeA: lo, placeB: hi },
        markerEnd: bidi ? undefined : { type: 'arrowclosed' },
        style: bidi ? undefined : { stroke: '#f59e0b', strokeWidth: 2 }
      } as Edge)
    }
    setEdges(nextEdges)
  }, [world, setEdges])

  const onConnect: OnConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    onConnectPlaces(connection.source, connection.target)
  }

  const handleNodeDragStop = (_: any, n: Node) => {
    onPositionsChange({ ...positions, [n.id]: { x: n.position.x, y: n.position.y } })
  }

  return (
    <div style={{ width:'100%', height:'100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, n) => onNodeDoubleClick(n.id)}
        onEdgeDoubleClick={(_, e) => onEdgeDoubleClick(String(e.data?.placeA ?? e.source), String(e.data?.placeB ?? e.target))}
        onNodeDragStop={handleNodeDragStop}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}
