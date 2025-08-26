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
  onEdgeDoubleClick: (wayId: string) => void
  showWayLabels: boolean
}

function slug(s: string){return s.toLowerCase().replace(/[^a-z0-9]+/g,'_')}

function reverseIdOf(world: World, w: any){
  const s = slug((world.place_defs[w.source]?.callnames?.[0] ?? String(w.source).replace(/^p_/, '')))
  const t = slug((world.place_defs[w.destination]?.callnames?.[0] ?? String(w.destination).replace(/^p_/, '')))
  return `w_${t}_${s}`
}

export default function GraphView({ world, positions, onPositionsChange, onConnectPlaces, onNodeDoubleClick, onEdgeDoubleClick, showWayLabels }: Props) {
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
    const nextEdges: Edge[] = Object.entries(world.way_defs).map(([wid, w]) => {
      const rev = reverseIdOf(world, w)
      const miss = !(rev in world.way_defs)
      return {
        id: wid,
        source: w.source,
        target: w.destination,
        markerEnd: { type: 'arrowclosed' },
        type: 'default',
        label: showWayLabels ? ((w.text_direction || wid) + (miss ? '  ⚠ no return' : '')) : undefined,
        style: miss ? { stroke: '#f59e0b', strokeWidth: 2 } : undefined,
        labelBgStyle: miss ? { fill: '#3f2e00', stroke: '#f59e0b' } : undefined,
        labelBgPadding: miss ? [2, 2] as any : undefined
      } as Edge
    })
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
    <div style={{ width:'100%', height:'100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, n) => onNodeDoubleClick(n.id)}
        onEdgeDoubleClick={(_, e) => onEdgeDoubleClick(String(e.id))}
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
