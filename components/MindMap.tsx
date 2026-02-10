
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';

interface Props {
  data: MindMapNode;
}

const MindMap: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const [modalNode, setModalNode] = useState<MindMapNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const nodeWidth = 220; 
    const baseNodeHeight = 60;
    const rankSep = 400; 
    const vertSep = 220; 

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const gMain = svg.append("g");
    const gLinks = gMain.append("g").attr("class", "links");
    const gNodes = gMain.append("g").attr("class", "nodes");

    zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => gMain.attr("transform", event.transform));

    svg.call(zoomRef.current);

    const root = d3.hierarchy(data);
    
    // Initial State: Expanded root + level-1 nodes, deeper levels collapsed
    root.descendants().forEach((d: any) => {
      if (d.depth >= 1 && d.children) {
        d._children = d.children;
        d.children = undefined;
      }
    });

    const update = (source: any) => {
      const tree = d3.tree<MindMapNode>().nodeSize([vertSep, rankSep]);
      tree(root);

      const nodes = root.descendants();
      const links = root.links();

      nodes.forEach((d: any) => {
        d.y = d.depth * rankSep;
      });

      const getNodeHeight = (d: any) => {
        let h = baseNodeHeight;
        if (d.depth === 0) h += 10; // Extra room for large root font
        const desc = d.data.description?.trim() || "";
        const img = d.data.imageUrl?.trim() || "";
        const isLeaf = !d.children && !d._children;
        
        if (desc && isLeaf) {
          const lines = Math.ceil(desc.length / 28);
          h += (Math.min(lines, 8) * 14) + 10;
        } else if (desc) {
          h += 24;
        }
        if (img) h += 70;
        return Math.max(h, baseNodeHeight);
      };

      const linkPath = (d: any) => {
        const start = { x: d.source.y + nodeWidth / 2, y: d.source.x };
        const end = { x: d.target.y - nodeWidth / 2, y: d.target.x };
        return `M${start.x},${start.y}C${(start.x + end.x) / 2},${start.y} ${(start.x + end.x) / 2},${end.y} ${end.x},${end.y}`;
      };

      const link = gLinks.selectAll(".link")
        .data(links, (d: any) => d.target.data.id);

      const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", (d: any) => {
          const sy = source.y ?? 0;
          const sx = source.x ?? 0;
          const o = { x: sy + nodeWidth/2, y: sx };
          return `M${o.x},${o.y}C${o.x},${o.y} ${o.x},${o.y} ${o.x},${o.y}`;
        });

      link.merge(linkEnter as any)
        .transition().duration(400)
        .attr("d", linkPath);

      link.exit().transition().duration(300).remove();

      const node = gNodes.selectAll(".node")
        .data(nodes, (d: any) => d.data.id);

      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", (d: any) => `translate(${source.y ?? 0},${source.x ?? 0})`)
        .on("click", (event, d: any) => {
          const hasChildrenOrCollapsed = !!(d.children || d._children);
          if (hasChildrenOrCollapsed) {
            if (d.children) {
              d._children = d.children;
              d.children = undefined;
            } else {
              d.children = d._children;
              d._children = undefined;
            }
            update(d);
          } else if (d.data.description || d.data.imageUrl) {
            setModalNode(d.data);
          }
        });

      nodeEnter.append("rect")
        .attr("class", (d: any) => `node-rect node-shadow ${d.data.url ? 'url-border' : 'standard-border'}`)
        .attr("width", nodeWidth)
        .attr("height", (d: any) => getNodeHeight(d))
        .attr("x", -nodeWidth / 2)
        .attr("y", (d: any) => -getNodeHeight(d) / 2)
        .attr("rx", 12);

      const fo = nodeEnter.append("foreignObject")
        .attr("width", nodeWidth - 24)
        .attr("height", (d: any) => getNodeHeight(d) - 10)
        .attr("x", -(nodeWidth - 24) / 2)
        .attr("y", (d: any) => -(getNodeHeight(d) - 10) / 2 + 6)
        .style("pointer-events", "none");

      fo.append("xhtml:div")
        .attr("class", "flex flex-col items-center justify-start text-center h-full overflow-hidden px-1")
        .html((d: any) => {
          const name = d.data.name || "Untitled";
          const desc = d.data.description?.trim() || "";
          const img = d.data.imageUrl?.trim() || "";
          const isLeaf = !d.children && !d._children;
          
          // Dynamic Font Sizing Logic
          const titleFontSize = d.depth === 0 ? 'text-[18px]' : (d.depth === 1 ? 'text-[15px]' : 'text-[13px]');
          
          return `
            <div class="${titleFontSize} font-bold text-slate-800 leading-tight w-full truncate mb-1">${name}</div>
            ${desc ? `<div class="text-[10px] text-slate-500 font-medium leading-snug w-full ${isLeaf ? '' : 'line-clamp-2'}">${desc}</div>` : ''}
            ${img ? `<img src="${img}" class="mt-2 rounded-lg object-cover w-full h-14 bg-slate-50 border border-slate-100" />` : ''}
          `;
        });

      nodeEnter.filter((d: any) => !!(d.children || d._children))
        .append("circle")
        .attr("class", "toggle-circle")
        .attr("cx", nodeWidth / 2)
        .attr("cy", 0)
        .attr("r", 7);

      const urlGroup = nodeEnter.filter((d: any) => !!d.data.url)
        .append("g")
        .attr("transform", (d: any) => {
            const h = getNodeHeight(d);
            return `translate(${nodeWidth/2 - 20}, ${-h/2 + 20})`;
        })
        .style("cursor", "pointer")
        .on("click", (event, d: any) => {
          event.stopPropagation();
          if (d.data.url) window.open(d.data.url, "_blank");
        });

      urlGroup.append("circle").attr("r", 15).attr("fill", "#eff6ff").attr("stroke", "#2563eb").attr("stroke-width", "1px");
      urlGroup.append("text").attr("font-family", "FontAwesome").attr("font-size", "14px").attr("text-anchor", "middle").attr("dominant-baseline", "middle").style("fill", "#2563eb").text("\uf0c1");

      const nodeUpdate = node.merge(nodeEnter as any);
      nodeUpdate.transition().duration(400).attr("transform", (d: any) => `translate(${d.y},${d.x})`);
      node.exit().transition().duration(300).attr("transform", (d: any) => `translate(${source.y ?? 0},${source.x ?? 0})`).style("opacity", 0).remove();

      if (source === root) centerView();
    };

    const centerView = () => {
      const scale = window.innerWidth < 640 ? 0.6 : 0.85;
      const xOffset = window.innerWidth < 640 ? 80 : width / 4;
      svg.transition().duration(800).call(zoomRef.current.transform, d3.zoomIdentity.translate(xOffset, height / 2).scale(scale));
    };

    update(root);
  }, [data]);

  const handleReset = () => {
    const scale = window.innerWidth < 640 ? 0.5 : 0.85;
    const xOffset = window.innerWidth < 640 ? 80 : window.innerWidth / 4;
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.translate(xOffset, window.innerHeight / 2).scale(scale));
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      <svg ref={svgRef} className="w-full h-full select-none touch-none"></svg>
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-40">
        <button onClick={handleReset} className="bg-white border border-slate-200 w-14 h-14 rounded-full flex items-center justify-center text-slate-600 shadow-2xl active:scale-90 transition-all hover:bg-slate-50">
          <i className="fas fa-expand-arrows-alt text-xl"></i>
        </button>
      </div>

      {modalNode && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="mobile-bottom-sheet bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden transition-all duration-300">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mt-5 mb-2 sm:hidden"></div>
            <div className="p-8 sm:p-10">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{modalNode.name}</h3>
                <button onClick={() => setModalNode(null)} className="text-slate-300 hover:text-slate-500 p-2 -mr-3 transition-colors">
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
              {modalNode.imageUrl && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <img src={modalNode.imageUrl} alt={modalNode.name} className="w-full h-56 sm:h-72 object-cover bg-slate-50" />
                </div>
              )}
              <div className="text-slate-600 leading-relaxed text-base sm:text-lg max-h-[45vh] overflow-y-auto pr-6 custom-scrollbar font-medium">
                {modalNode.description || "No further details available."}
              </div>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                {modalNode.url && (
                  <button onClick={() => window.open(modalNode.url, "_blank")} className="flex-[2] flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-external-link-alt"></i> Visit Resource
                  </button>
                )}
                <button onClick={() => setModalNode(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-500 rounded-2xl font-bold text-lg hover:bg-slate-50 active:scale-95 transition-all">
                  Go Back
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setModalNode(null)}></div>
        </div>
      )}
    </div>
  );
};

export default MindMap;
