
import requests
import json
import os
import argparse
from datetime import datetime

# CONFIGURATION - Replace this with your actual Deployment URL from Apps Script
DEFAULT_GAS_URL = "https://web.appscript.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/exec"

def bundle_logic(project_root):
    """Gathers all components into a dictionary for the HTML template."""
    logic = {}
    files_to_bundle = {
        "types.ts": "types.ts",
        "services/dataConverter.ts": "dataConverter.ts",
        "components/MindMap.tsx": "MindMap.tsx",
        "App.tsx": "App.tsx"
    }
    
    for relative_path, key in files_to_bundle.items():
        full_path = os.path.join(project_root, relative_path)
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Clean up imports/exports for the browser Babel environment
                lines = content.split('\n')
                cleaned = []
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith(('import ', 'export type', 'import type')):
                        continue # Skip imports in bundle
                    elif stripped.startswith('export '):
                        cleaned.append(line.replace('export ', '', 1))
                    else:
                        cleaned.append(line)
                logic[key] = '\n'.join(cleaned)
        else:
            logic[key] = f"// Error: {relative_path} not found"
    return logic

def sync(gas_url):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    output_json = os.path.join(project_root, "data.json")
    output_html = os.path.join(project_root, "web_site_ready.html")

    print(f"\n--- Knowledge Explorer Sync v3.0 (Final) ---")
    
    if "YOUR_APPS_SCRIPT_DEPLOYMENT_ID" in gas_url:
        print("❌ ERROR: Placeholder URL detected.")
        print("Please run: python scripts/sync_data.py --url YOUR_APP_SCRIPT_URL")
        return

    print(f"📡 Syncing with spreadsheets...")
    
    try:
        response = requests.get(gas_url, timeout=30)
        response.raise_for_status()
        payload = response.json()
        
        nodes = []
        timestamp = datetime.now().isoformat()
        if isinstance(payload, dict):
            if "error" in payload:
                print(f"❌ Apps Script Error: {payload['error']}")
                return
            nodes = payload.get("nodes", [])
            timestamp = payload.get("timestamp", timestamp)
        elif isinstance(payload, list):
            nodes = payload
            print("ℹ️ Note: Flat list received.")
        
        print(f"✅ Sync Successful: {len(nodes)} nodes found.")

        final_payload = { "timestamp": timestamp, "nodes": nodes }

        # Save local for Vite
        with open(output_json, "w", encoding='utf-8') as f:
            json.dump(final_payload, f, indent=2)

        # Generate Google Sites HTML
        logic = bundle_logic(project_root)
        template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Explorer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body, html, #root {{ margin: 0; padding: 0; height: 100vh; width: 100vw; overflow: hidden; background: #f8fafc; font-family: sans-serif; }}
        .node-rect {{ fill: #ffffff; cursor: pointer; transition: stroke 0.2s; }}
        .link {{ fill: none; stroke: #cbd5e1; stroke-width: 1.5px; }}
        .url-border {{ stroke-width: 2.5px !important; stroke: #2563eb !important; }}
        .standard-border {{ stroke: #e2e8f0; stroke-width: 1px; }}
        .node-shadow {{ filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.05)); }}
        .toggle-circle {{ fill: #64748b; stroke: #fff; stroke-width: 2px; cursor: pointer; }}
        .custom-scrollbar::-webkit-scrollbar {{ width: 4px; }}
        .custom-scrollbar::-webkit-scrollbar-thumb {{ background: #e2e8f0; border-radius: 10px; }}
        @media (max-width: 640px) {{
            .mobile-bottom-sheet {{ position: fixed; bottom: 0; left: 0; right: 0; animation: slideUp 0.3s forwards; border-radius: 2rem 2rem 0 0; z-index: 3000; }}
        }}
        @keyframes slideUp {{ from {{ transform: translateY(100%); }} to {{ transform: translateY(0); }} }}
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>

    <script>
        window.MINDMAP_DATA = {json.dumps(nodes)};
        window.SYNC_INFO = {{ timestamp: "{timestamp}" }};
    </script>

    <script type="text/babel">
        const {{ useState, useEffect, useRef }} = React;

        {logic['types.ts']}
        {logic['dataConverter.ts']}

        const MindMap = ({{ data }}) => {{
            const svgRef = useRef(null);
            const zoomRef = useRef(null);
            const [modalNode, setModalNode] = useState(null);

            useEffect(() => {{
                if (!svgRef.current || !data) return;
                const width = window.innerWidth, height = window.innerHeight;
                const nodeWidth = 220, baseNodeHeight = 60, rankSep = 400, vertSep = 220;

                const svg = d3.select(svgRef.current);
                svg.selectAll("*").remove();
                const gMain = svg.append("g");
                const gLinks = gMain.append("g").attr("class", "links");
                const gNodes = gMain.append("g").attr("class", "nodes");

                zoomRef.current = d3.zoom().scaleExtent([0.1, 3]).on("zoom", (e) => gMain.attr("transform", e.transform));
                svg.call(zoomRef.current);

                const root = d3.hierarchy(data);
                root.descendants().forEach((d) => {{
                    if (d.depth >= 1 && d.children) {{ d._children = d.children; d.children = undefined; }}
                }});

                const update = (source) => {{
                    d3.tree().nodeSize([vertSep, rankSep])(root);
                    const nodes = root.descendants(), links = root.links();
                    nodes.forEach((d) => {{ d.y = d.depth * rankSep; }});

                    const getNodeHeight = (d) => {{
                        let h = d.depth === 0 ? baseNodeHeight + 10 : baseNodeHeight;
                        const desc = d.data.description?.trim() || "";
                        const img = d.data.imageUrl?.trim() || "";
                        if (desc && !d.children && !d._children) h += (Math.min(Math.ceil(desc.length / 28), 8) * 14) + 10;
                        else if (desc) h += 24;
                        if (img) h += 70;
                        return h;
                    }};

                    const linkPath = (d) => `M${{d.source.y + nodeWidth/2}},${{d.source.x}}C${{(d.source.y + d.target.y)/2}},${{d.source.x}} ${{(d.source.y + d.target.y)/2}},${{d.target.x}} ${{d.target.y - nodeWidth/2}},${{d.target.x}}`;

                    const link = gLinks.selectAll(".link").data(links, (d) => d.target.data.id);
                    link.enter().append("path").attr("class", "link").attr("d", d => `M${{source.y+nodeWidth/2}},${{source.x}}C${{source.y+nodeWidth/2}},${{source.x}} ${{source.y+nodeWidth/2}},${{source.x}} ${{source.y+nodeWidth/2}},${{source.x}}`)
                        .merge(link).transition().duration(400).attr("d", linkPath);
                    link.exit().remove();

                    const node = gNodes.selectAll(".node").data(nodes, (d) => d.data.id);
                    const nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", `translate(${{source.y}},${{source.x}})`)
                        .on("click", (e, d) => {{
                            if (d.children || d._children) {{ 
                                if (d.children) {{ d._children = d.children; d.children = undefined; }}
                                else {{ d.children = d._children; d._children = undefined; }}
                                update(d);
                            }} else setModalNode(d.data);
                        }});

                    nodeEnter.append("rect").attr("class", d => `node-rect node-shadow ${{d.data.url ? 'url-border' : 'standard-border'}}`)
                        .attr("width", nodeWidth).attr("height", d => getNodeHeight(d)).attr("x", -nodeWidth/2).attr("y", d => -getNodeHeight(d)/2).attr("rx", 12);

                    nodeEnter.append("foreignObject").attr("width", nodeWidth-24).attr("height", d => getNodeHeight(d)-10).attr("x", -(nodeWidth-24)/2).attr("y", d => -(getNodeHeight(d)-10)/2+6).style("pointer-events", "none")
                        .append("xhtml:div").attr("class", "flex flex-col items-center text-center h-full overflow-hidden px-1")
                        .html(d => {{
                            const fSize = d.depth === 0 ? 'text-[18px]' : (d.depth === 1 ? 'text-[15px]' : 'text-[13px]');
                            return `<div class="${{fSize}} font-bold text-slate-800 leading-tight w-full truncate mb-1">${{d.data.name}}</div>
                                    ${{d.data.description ? `<div class="text-[10px] text-slate-500 font-medium leading-snug w-full line-clamp-2">${{d.data.description}}</div>` : ''}}
                                    ${{d.data.imageUrl ? `<img src="${{d.data.imageUrl}}" class="mt-2 rounded-lg object-cover w-full h-14 bg-slate-50 border border-slate-100" />` : ''}}`;
                        }});

                    nodeEnter.filter(d => !!(d.children || d._children)).append("circle").attr("class", "toggle-circle").attr("cx", nodeWidth/2).attr("cy", 0).attr("r", 7);
                    
                    const urlG = nodeEnter.filter(d => !!d.data.url).append("g").attr("transform", d => `translate(${{nodeWidth/2-20}}, ${{ -getNodeHeight(d)/2+20 }})`).style("cursor", "pointer")
                        .on("click", (e, d) => {{ e.stopPropagation(); window.open(d.data.url, "_blank"); }});
                    urlG.append("circle").attr("r", 15).attr("fill", "#eff6ff").attr("stroke", "#2563eb");
                    urlG.append("text").attr("font-family", "FontAwesome").attr("font-size", "14px").attr("text-anchor", "middle").attr("dominant-baseline", "middle").style("fill", "#2563eb").text("\uf0c1");

                    node.merge(nodeEnter).transition().duration(400).attr("transform", d => `translate(${{d.y}},${{d.x}})`);
                    node.exit().remove();
                    if (source === root) svg.transition().duration(800).call(zoomRef.current.transform, d3.zoomIdentity.translate(width/4, height/2).scale(0.8));
                }};
                update(root);
            }}, [data]);

            return (
                <div className="w-full h-full relative overflow-hidden bg-slate-50">
                    <svg ref={{svgRef}} className="w-full h-full select-none"></svg>
                    <div className="absolute bottom-8 right-8 z-40">
                        <button onClick={{() => d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity.translate(window.innerWidth/4, window.innerHeight/2).scale(0.85))}} className="bg-white border border-slate-200 w-14 h-14 rounded-full flex items-center justify-center text-slate-600 shadow-2xl"><i className="fas fa-expand-arrows-alt text-xl"></i></button>
                    </div>
                    {{modalNode && (
                        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4" onClick={{() => setModalNode(null)}}>
                            <div className="mobile-bottom-sheet bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-w-xl w-full p-8 sm:p-10" onClick={{e => e.stopPropagation()}}>
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{{modalNode.name}}</h3>
                                    <button onClick={{() => setModalNode(null)}} className="text-slate-300 hover:text-slate-500 p-2"><i className="fas fa-times text-2xl"></i></button>
                                </div>
                                {{modalNode.imageUrl && <img src={{modalNode.imageUrl}} className="w-full h-56 sm:h-72 object-cover rounded-2xl mb-8 border" />}}
                                <div className="text-slate-600 leading-relaxed text-base sm:text-lg max-h-[40vh] overflow-y-auto custom-scrollbar font-medium">{{modalNode.description || "No further details."}}</div>
                                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                                    {{modalNode.url && <button onClick={{() => window.open(modalNode.url, "_blank")}} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl"><i className="fas fa-external-link-alt"></i> Visit Resource</button>}}
                                    <button onClick={{() => setModalNode(null)}} className="flex-1 py-5 border-2 text-slate-500 rounded-2xl font-bold text-lg">Go Back</button>
                                </div>
                            </div>
                        </div>
                    )}}
                </div>
            );
        }};

        const App = () => {{
            const [data, setData] = useState(null);
            useEffect(() => {{ if (window.MINDMAP_DATA) setData(buildHierarchy(window.MINDMAP_DATA)); }}, []);
            return (
                <div className="w-full h-screen flex flex-col">
                    <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg"><i className="fas fa-project-diagram text-sm"></i></div>
                            <div><h1 className="text-xl font-bold text-slate-800 tracking-tight">Knowledge Explorer</h1><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Knowledge Explorer</p></div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Updated: {{window.SYNC_INFO.timestamp.split('T')[0]}}</div>
                    </header>
                    <main className="flex-1 relative">{{data ? <MindMap data={{data}} /> : <div className="p-20 text-center">Loading...</div>}}</main>
                </div>
            );
        }};

        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>"""

        with open(output_html, "w", encoding='utf-8') as f:
            f.write(template)
        
        print(f"💾 File Ready: web_site_ready.html")
        print(f"✨ ALL SYSTEMS STABLE ✨")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', type=str, help='web apps Script URL')
    sync(parser.parse_args().url if parser.parse_args().url else DEFAULT_GAS_URL)
