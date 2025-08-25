import React, { useEffect } from 'react'
import ReactFlow, { Background, Controls, MiniMap, Connection, Edge, Node,
  OnConnect, useEdgesState, useNodesState } from 'reactflow'
import { World } from '../types/world'

type Props = {
  world: World
  positions: Record<string, { x: number, y: number }>
  onPositionsChange: (pos: Record<string, { x: number, y: number }>) => void
  onConnectPlaces: (sourceId: string, targetId: string) => void
  onNodeDoubleClick: (placeId: string) => void
  onEdgeDoubleClick: (wayId: string) => void
  showWayLabels: boolean                       // <-- NEU
}

export default function GraphView({
  world, positions, onPositionsChange, onConnectPlaces,
  onNodeDoubleClick, onEdgeDoubleClick, showWayLabels
}: Props) {

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // (Re)build nodes whenever world/positions change
  useEffect(() => {
    const nextNodes: Node[] = Object.entries(world.place_defs).map(([pid, p], idx) => ({
      id: pid,
      position: positions[pid] ?? { x: idx * 120, y: 50 + (idx % 5) * 80 },
      data: { label: (p.callnames?.[0] ?? pid.replace(/^p_/, '')) },
      type: 'default'
    }))
    setNodes(nextNodes)
  }, [world, positions, setNodes])

  // (Re)build edges whenever world **or** showWayLabels change
  useEffect(() => {
    const nextEdges: Edge[] = Object.entries(world.way_defs).map(([wid, w]) => ({
      id: wid,
      source: w.source,
      target: w.destination,
      // label nur anzeigen, wenn toggled on
      label: showWayLabels ? (w.text_direction || wid) : undefined,
      markerEnd: { type: 'arrowclosed' },
      type: 'default'
    }))
    setEdges(nextEdges)
  }, [world, showWayLabels, setEdges])

  const onConnect: OnConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    onConnectPlaces(connection.source, connection.target)
  }

  const handleNodeDragStop = (_: any, n: Node) => {
    onPositionsChange({ ...positions, [n.id]: { x: n.position.x, y: n.position.y } })
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, n) => onNodeDoubleClick(n.id)}
        onEdgeDoubleClick={(_, e) => onEdgeDoubleClick(e.id as string)}
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