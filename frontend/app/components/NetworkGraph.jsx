import React, { useEffect, useState, useRef } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion } from 'framer-motion';
import { Zap, ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';

export default function NetworkGraph({ data, onNodeClick }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(new Set());
  const transformRef = useRef({ scale: 1 });
  const dragRef = useRef({ node: null, hasDragged: false, pointerId: null, isComponentDrag: false, currentSelection: new Set() });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedComponent(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getConnectedComponent = (startNode) => {
    // Build a lookup once per call instead of nodes.find() per neighbor (O(1) vs O(n) lookups)
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set();
    const queue = [startNode];
    visited.add(startNode.id);
    while (queue.length > 0) {
      const current = queue.shift();
      current.neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighborNode = nodeById.get(neighborId);
          if (neighborNode) queue.push(neighborNode);
        }
      });
    }
    return visited;
  };

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

  // Shorten long relation strings for display
  const formatRelation = (rel) => {
    if (!rel) return '';
    const cleaned = rel.replace(/_/g, ' ');
    return cleaned.length > 18 ? cleaned.slice(0, 16) + '…' : cleaned;
  };

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const d3Nodes = data.nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
    // Defensive: edges may be missing/undefined for a freshly created case with no relationships yet
    const d3Links = (data.edges || []).map(e => ({ source: e.source, target: e.target, relation: e.relation }));

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

    // Scale forces relative to graph size so larger networks don't take forever to
    // settle or sprawl further than the fixed constants assumed for a small graph.
    const n = d3Nodes.length;
    const chargeStrength = Math.max(-900, -300 - n * 8);
    const linkDistance = Math.max(120, 280 - n * 2);
    const collideRadius = Math.max(60, 140 - n * 1.5);

    let tickCount = 0;

    const simulation = forceSimulation(d3Nodes)
      .force('link', forceLink(d3Links).id(d => d.id).distance(linkDistance))
      .force('charge', forceManyBody().strength(chargeStrength))
      .force('collide', forceCollide().radius(collideRadius))
      .force('center', forceCenter(width / 2, height / 2))
      // Weak per-node pull toward center — forceCenter alone only recenters the
      // average position, so disconnected components can otherwise drift off-screen.
      .force('x', forceX(width / 2).strength(0.02))
      .force('y', forceY(height / 2).strength(0.02))
      .on('tick', () => {
        tickCount++;
        // Re-render every 3rd tick while the layout is still moving fast, and every
        // tick once alpha is low (near settled), so the settle still looks smooth
        // without forcing a full React re-render 60x/sec throughout the whole simulation.
        if (tickCount % 3 === 0 || simulation.alpha() < 0.05) {
          setNodes([...d3Nodes]);
          setLinks([...d3Links]);
        }
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

  // Render hovered/selected nodes last so their glow rings aren't occluded by
  // later-in-array nodes (SVG paint order follows DOM order).
  const sortedNodes = [...nodes].sort((a, b) => {
    const aActive = (a === hoverNode || selectedComponent.has(a.id)) ? 1 : 0;
    const bActive = (b === hoverNode || selectedComponent.has(b.id)) ? 1 : 0;
    return aActive - bActive;
  });

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
        panning={{ velocityDisabled: true, excluded: ['nodrag'] }}
        alignmentAnimation={{ animationTime: 0 }}
        limitToBounds={false}
        onTransformed={(ref) => {
          if (ref.state) transformRef.current = ref.state;
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
          const handleResetView = () => {
            if (!nodes || nodes.length === 0) {
              resetTransform();
              return;
            }

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            nodes.forEach(n => {
              if (n.x !== undefined && n.y !== undefined) {
                if (n.x < minX) minX = n.x;
                if (n.x > maxX) maxX = n.x;
                if (n.y < minY) minY = n.y;
                if (n.y > maxY) maxY = n.y;
              }
            });

            if (minX === Infinity) {
              resetTransform();
              return;
            }

            const graphWidth = maxX - minX;
            const graphHeight = maxY - minY;
            const padding = 150; // Extra padding

            const container = containerRef.current;
            const containerWidth = container ? container.clientWidth : 800;
            const containerHeight = container ? container.clientHeight : 600;

            const scaleX = containerWidth / (graphWidth + padding);
            const scaleY = containerHeight / (graphHeight + padding);
            // Limit scale between 0.1 and 2 to avoid excessive zoom in/out
            const scale = Math.max(0.1, Math.min(scaleX, scaleY, 2));

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            const positionX = (containerWidth / 2) - (centerX * scale);
            const positionY = (containerHeight / 2) - (centerY * scale);

            setTransform(positionX, positionY, scale, 400);
          };

          return (
            <React.Fragment>
              {/* Bottom Right Controls Group */}
              <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
                {/* Keyboard Shortcuts Legend Box */}
                <div className="hidden md:flex flex-col justify-between w-50 h-24 bg-slate-900/80 backdrop-blur-xl p-2.5 rounded-xl border border-slate-700/50 shadow-xl pointer-events-none">
                  {/* Header */}
                  <div className="flex items-center gap-1.5">
                    <MousePointer2 className="w-3.5 h-3.5 text-primary" />

                    <span className="text-[10px] font-bold text-slate-200 tracking-wider uppercase">
                      Graph Controls
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col gap-1">
                    {/* Move Node */}
                    

                    {/* Move Component */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">
                        Select Component
                      </span>

                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[8px]">
                          Shift
                        </kbd>

                        <span className="text-[8px] text-slate-600">+</span>

                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[8px]">
                          Click
                        </kbd>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">
                        Move Node
                      </span>

                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[8px]">
                        Drag
                      </kbd>
                    </div>

                    {/* Clear Selection */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">
                        Clear Selection
                      </span>

                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[8px]">
                        Esc
                      </kbd>
                    </div>


                  </div>
                </div>

                {/* Zoom Controls Toolbar Box */}
                <div className="flex flex-col justify-between items-center w-9 h-24 bg-slate-900/80 backdrop-blur-xl p-1 rounded-xl border border-slate-700/50 shadow-xl">
                  <button
                    onClick={() => zoomIn()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleResetView()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset View"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                <svg
                  className="w-full h-full overflow-visible"
                  width="100%"
                  height="100%"
                  onPointerDown={() => setSelectedComponent(new Set())}
                >

                  {/* Draw Links */}
                  <g className="links">
                    {links.map((link, i) => {
                      const isHoveredNodeLink = hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id);
                      const isSelectedComponentLink = selectedComponent.has(link.source.id) && selectedComponent.has(link.target.id);

                      const hasSelection = selectedComponent.size > 0;
                      const isDimmed = hasSelection ? !isSelectedComponentLink : (hoverNode && !isHoveredNodeLink);

                      const strokeColor = isSelectedComponentLink
                        ? "rgba(59, 130, 246, 0.8)"
                        : (isHoveredNodeLink ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.12)");
                      const strokeWidth = isSelectedComponentLink ? 2 : (isHoveredNodeLink ? 1.5 : 0.75);

                      const x1 = link.source.x;
                      const y1 = link.source.y;
                      const x2 = link.target.x;
                      const y2 = link.target.y;

                      if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;

                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;

                      // Calculate angle so label follows the link direction
                      let angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                      // Keep text right-side-up
                      if (angle > 90) angle -= 180;
                      if (angle < -90) angle += 180;

                      const labelText = formatRelation(link.relation);

                      return (
                        <g key={`link-${i}`} className="transition-opacity duration-200" style={{ opacity: isDimmed ? 0.05 : 1 }}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                          />

                          {/* Edge label: displayed only when hovered or part of a selected component */}
                          {labelText && (isHoveredNodeLink || isSelectedComponentLink) && (
                            <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                              <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={isHoveredNodeLink || isSelectedComponentLink ? "rgba(255, 255, 255, 0.95)" : "rgba(203, 213, 225, 0.7)"}
                                fontSize="10"
                                fontWeight={isHoveredNodeLink ? "600" : "500"}
                                letterSpacing="0.25"
                                style={{
                                  paintOrder: "stroke fill",
                                  stroke: "#050505",
                                  strokeWidth: "3px",
                                  strokeLinejoin: "round",
                                  strokeLinecap: "round",
                                }}
                                className="pointer-events-none select-none"
                              >
                                {labelText}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* Draw Nodes */}
                  <g className="nodes">
                    {sortedNodes.map((node) => {
                      if (node.x === undefined || node.y === undefined) return null;

                      const isSelected = selectedComponent.has(node.id);
                      const isHovered = node === hoverNode;
                      const isNeighbor = hoverNode && hoverNode.neighbors.includes(node.id);

                      const hasSelection = selectedComponent.size > 0;
                      const isDimmed = hasSelection ? !isSelected : (hoverNode && !isHovered && !isNeighbor);

                      const nodeColor = getNodeColor(node.type);
                      const radius = (isHovered || isSelected) ? 25 : 19;

                      // Truncate long labels
                      const displayLabel = node.label.length > 24 ? node.label.slice(0, 22) + '…' : node.label;

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          className="cursor-pointer transition-opacity duration-200 nodrag"
                          style={{ opacity: isDimmed ? 0.1 : 1 }}
                          onMouseEnter={() => setHoverNode(node)}
                          onMouseLeave={() => setHoverNode(null)}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.target.setPointerCapture(e.pointerId);

                            let isComponentDrag = false;
                            let currentSelection = selectedComponent;

                            // Ctrl/Meta click to select component
                            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                              currentSelection = getConnectedComponent(node);
                              setSelectedComponent(currentSelection);
                              isComponentDrag = true;
                            } else if (currentSelection.has(node.id)) {
                              isComponentDrag = true;
                            } else {
                              setSelectedComponent(new Set());
                              currentSelection = new Set();
                            }

                            dragRef.current = { node, hasDragged: false, pointerId: e.pointerId, isComponentDrag, currentSelection };
                          }}
                          onPointerMove={(e) => {
                            if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                              if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
                                dragRef.current.hasDragged = true;
                                const scale = transformRef.current.scale;
                                const dx = e.movementX / scale;
                                const dy = e.movementY / scale;

                                if (dragRef.current.isComponentDrag) {
                                  nodes.forEach(n => {
                                    if (dragRef.current.currentSelection.has(n.id)) {
                                      n.x += dx;
                                      n.y += dy;
                                      n.fx = n.x;
                                      n.fy = n.y;
                                    }
                                  });
                                } else {
                                  node.x += dx;
                                  node.y += dy;
                                  node.fx = node.x;
                                  node.fy = node.y;
                                }
                                setNodes(prev => [...prev]);
                              }
                            }
                          }}
                          onPointerUp={(e) => {
                            if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                              e.target.releasePointerCapture(e.pointerId);
                              if (!dragRef.current.hasDragged) {
                                onNodeClick(node);
                                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                  setSelectedComponent(new Set());
                                }
                              }
                              dragRef.current = { node: null, hasDragged: false, pointerId: null, isComponentDrag: false, currentSelection: new Set() };
                            }
                          }}
                          onPointerCancel={(e) => {
                            if (dragRef.current.node === node && dragRef.current.pointerId === e.pointerId) {
                              e.target.releasePointerCapture(e.pointerId);
                              dragRef.current = { node: null, hasDragged: false, pointerId: null, isComponentDrag: false, currentSelection: new Set() };
                            }
                          }}
                        >
                          {/* Glow ring on hover/neighbor/selected */}
                          {(isHovered || isNeighbor || isSelected) && (
                            <circle
                              r={radius + 7}
                              fill="transparent"
                              stroke={isSelected ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.35)"}
                              strokeWidth={isSelected ? "4" : "3"}
                              className={isSelected ? "" : "animate-pulse"}
                            />
                          )}

                          {/* Node Circle */}
                          <circle
                            r={radius}
                            fill={nodeColor}
                            stroke={(isHovered || isSelected) ? "#ffffff" : "rgba(255,255,255,0.25)"}
                            strokeWidth={(isHovered || isSelected) ? 3.5 : 2.5}
                            className="transition-all duration-300 drop-shadow-xl"
                          />

                          {/* Node Label — bold, bright white text */}
                          <g transform={`translate(0, ${radius + 20})`}>
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#ffffff"
                              fontSize="14.5"
                              fontWeight="700"
                              letterSpacing="0.25"
                              style={{
                                paintOrder: "stroke fill",
                                stroke: "#050505",
                                strokeWidth: "3.5px",
                                strokeLinejoin: "round",
                                strokeLinecap: "round",
                              }}
                              className="pointer-events-none select-none"
                            >
                              {displayLabel}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>

                </svg>
              </TransformComponent>
            </React.Fragment>
          );
        }}
      </TransformWrapper>
    </motion.div>
  );
}