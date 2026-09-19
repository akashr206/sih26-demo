import React, { useEffect, useState, useRef, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion } from 'framer-motion';
import { Zap, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function NetworkGraph({ data, onNodeClick }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [hoverNode, setHoverNode] = useState(null);
  const transformRef = useRef({ scale: 1 });
  const dragRef = useRef({ node: null, hasDragged: false, pointerId: null });

  const getNodeColor = (type) => {
    switch (type.toUpperCase()) {
      case 'PERSON': return '#3b82f6';
      case 'ORG': return '#8b5cf6';
      case 'LOCATION': return '#10b981';
      case 'PHONE': return '#f59e0b';
      case 'VEHICLE_PLATE': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    // Clone data for d3 physics engine
    const d3Nodes = data.nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
    const d3Links = data.edges.map(e => ({ source: e.source, target: e.target, relation: e.relation }));

    // Precalculate neighbors for fast hover checks
    d3Nodes.forEach(n => { n.neighbors = []; });
    d3Links.forEach(link => {
      const a = d3Nodes.find(n => n.id === link.source);
      const b = d3Nodes.find(n => n.id === link.target);
      if (a && b) {
        a.neighbors.push(b.id);
        b.neighbors.push(a.id);
      }
    });

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Setup headless physics simulation
    const simulation = forceSimulation(d3Nodes)
      .force('link', forceLink(d3Links).id(d => d.id).distance(80))
      .force('charge', forceManyBody().strength(-100))
      .force('collide', forceCollide().radius(60))
      .force('center', forceCenter(width / 2, height / 2))
      .on('tick', () => {
        // Sync headless physics coordinates to React state at 60fps
        setNodes([...d3Nodes]);
        setLinks([...d3Links]);
      });

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 flex-col">
        <Zap className="w-12 h-12 mb-4 opacity-50" />
        <p>No network data available</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full relative cursor-grab active:cursor-grabbing bg-[#050505]"
      ref={containerRef}
    >
      <TransformWrapper
        initialScale={1}
        initialPositionX={0}
        initialPositionY={0}
        minScale={0.1}
        maxScale={4}
        wheel={{ step: 0.05 }}
        pinch={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        alignmentAnimation={{ animationTime: 0 }}
        limitToBounds={false}
        onTransformed={(ref) => {
          if (ref.state) transformRef.current = ref.state;
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <React.Fragment>
            {/* Controls Toolbar */}
            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-xl">
              <button 
                onClick={() => zoomIn()} 
                className="p-2 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => zoomOut()} 
                className="p-2 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                onClick={() => resetTransform()} 
                className="p-2 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
                title="Reset View"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
            
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <svg className="w-full h-full overflow-visible" width="100%" height="100%">
            
            {/* Draw Links */}
            <g className="links">
              {links.map((link, i) => {
                const isHoveredNodeLink = hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id);
                const isDimmed = hoverNode && !isHoveredNodeLink;
                
                // Coordinates
                const x1 = link.source.x;
                const y1 = link.source.y;
                const x2 = link.target.x;
                const y2 = link.target.y;
                
                if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={`link-${i}`} className="transition-opacity duration-200" style={{ opacity: isDimmed ? 0.05 : 1 }}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isHoveredNodeLink ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.2)"}
                      strokeWidth={isHoveredNodeLink ? 2 : 1}
                    />
                    
                    {/* Relationship Label Pill */}
                    {!isDimmed && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-30"
                          y="-10"
                          width="60"
                          height="20"
                          rx="4"
                          fill="rgba(20, 20, 25, 0.9)"
                          className="transition-all duration-200"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isHoveredNodeLink ? "rgba(255,255,255,1)" : "rgba(200,200,255,0.7)"}
                          fontSize="9"
                          fontWeight="500"
                          className="pointer-events-none select-none transition-colors duration-200"
                        >
                          {link.relation}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Draw Nodes */}
            <g className="nodes">
              {nodes.map((node) => {
                if (node.x === undefined || node.y === undefined) return null;

                const isHovered = node === hoverNode;
                const isNeighbor = hoverNode && hoverNode.neighbors.includes(node.id);
                const isDimmed = hoverNode && !isHovered && !isNeighbor;
                
                const nodeColor = getNodeColor(node.type);
                const radius = isHovered ? 14 : 10;
                
                return (
                  <g 
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer transition-opacity duration-200"
                    style={{ opacity: isDimmed ? 0.1 : 1 }}
                    onMouseEnter={() => setHoverNode(node)}
                    onMouseLeave={() => setHoverNode(null)}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.target.setPointerCapture(e.pointerId);
                      dragRef.current = { node, hasDragged: false, pointerId: e.pointerId };
                    }}
                    onPointerMove={(e) => {
                      if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                        if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
                          dragRef.current.hasDragged = true;
                          const scale = transformRef.current.scale;
                          node.x += e.movementX / scale;
                          node.y += e.movementY / scale;
                          node.fx = node.x;
                          node.fy = node.y;
                          setNodes(prev => [...prev]); // force re-render
                        }
                      }
                    }}
                    onPointerUp={(e) => {
                      if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                        e.target.releasePointerCapture(e.pointerId);
                        if (!dragRef.current.hasDragged) {
                          onNodeClick(node);
                        }
                        dragRef.current = { node: null, hasDragged: false, pointerId: null };
                      }
                    }}
                    onPointerCancel={(e) => {
                      if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                        e.target.releasePointerCapture(e.pointerId);
                        dragRef.current = { node: null, hasDragged: false, pointerId: null };
                      }
                    }}
                  >
                    {/* Glow effect for active/neighbor nodes */}
                    {(isHovered || isNeighbor) && (
                      <circle 
                        r={radius + 4} 
                        fill="transparent" 
                        stroke="rgba(255,255,255,0.3)" 
                        strokeWidth="2" 
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Node Circle */}
                    <circle
                      r={radius}
                      fill={nodeColor}
                      stroke={isHovered ? "white" : "rgba(255,255,255,0.1)"}
                      strokeWidth={isHovered ? 2 : 1}
                      className="transition-all duration-300 drop-shadow-lg"
                    />

                    {/* Node Label */}
                    <g transform={`translate(0, ${radius + 12})`}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="rgba(255, 255, 255, 0.9)"
                        fontSize="12"
                        fontWeight={isHovered ? "600" : "400"}
                        className="pointer-events-none select-none drop-shadow-md"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                      >
                        {node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
            
            </svg>
            </TransformComponent>
          </React.Fragment>
        )}
      </TransformWrapper>
    </motion.div>
  );
}
