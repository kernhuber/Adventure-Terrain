import React, { useMemo, useCallback } from 'react'
import ReactFlow, { Background, Controls, MiniMap, Connection, Node, Edge, useEdgesState, useNodesState, MarkerType, OnConnect } from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../state/store'

function deriveNodes(world: ReturnType<typeof useStore.getState>['world']): Node[] {
  const pos = world._editor?.positions ?? {}
  return Object.entries(world.place_defs).map(([pid, p]) => ({
    id: pid,
    type: 'default',
    position: pos[pid] ?? { x: 0, y: 0 },
    data: { label: (p.callnames && p.callnames[0]) || pid }
  }))
}
// Build one visual edge per pair (source, target) regardless of two directions in data
function deriveEdges(world: ReturnType<typeof useStore.getState>['world']): Edge[] {
  const seen = new Set<string>(); const edges: Edge[] = []
  for (const [wid, w] of Object.entries(world.way_defs)) {
    const key = [w.source, w.destination].sort().join('::')
    if (seen.has(key)) continue
    seen.add(key)
    edges.push({ id:key, source:w.source, target:w.destination, markerEnd:{ type: MarkerType.ArrowClosed }, markerStart:{ type: MarkerType.ArrowClosed }, label:'' })
  }
  return edges
}
export default function Canvas() {
  const world = useStore(s => s.world)
  const movePlace = useStore(s => s.movePlace)
  const connectPlaces = useStore(s => s.connectPlaces)

  const [nodes, setNodes, onNodesChange] = useNodesState(useMemo(() => deriveNodes(world), [world]))
  const [edges, setEdges, onEdgesChange] = useEdgesState(useMemo(() => deriveEdges(world), [world]))

  React.useEffect(() => { setNodes(deriveNodes(world)) }, [world, setNodes])
  React.useEffect(() => { setEdges(deriveEdges(world)) }, [world, setEdges])

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (params.source && params.target) connectPlaces(params.source, params.target)
  }, [connectPlaces])

  const onNodeDragStop = useCallback((_: any, node: Node) => { movePlace(node.id, node.position) }, [movePlace])

  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDragStop={onNodeDragStop} fitView>
      <MiniMap /><Controls /><Background gap={16} />
    </ReactFlow>
  )
}