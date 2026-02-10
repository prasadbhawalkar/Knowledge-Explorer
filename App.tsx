
import React, { useState, useEffect } from 'react';
import MindMap from './components/MindMap';
import { MindMapNode, RawNode } from './types';
import { buildHierarchy } from './services/dataConverter';

declare global {
  interface Window {
    MINDMAP_DATA?: RawNode[];
  }
}

type DataSource = 'Sheet (Injected)' | 'Local data.json' | 'Fallback (Code)';

const App: React.FC = () => {
  const [data, setData] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>('Fallback (Code)');
  const [lastSync, setLastSync] = useState<string>("");

  const defaultData: RawNode[] = [
    { 
      id: "1", 
      parentId: null, 
      label: "Knowledge Explorer", 
      url: "https://google.com",
      description: "No data.json found. Run scripts/sync_data.py first to see your spreadsheet content.",
      imageUrl: "https://placehold.co/100x60/3b82f6/white?text=Knowledge"
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Check for injected data (Standalone HTML mode)
        if (window.MINDMAP_DATA && Array.isArray(window.MINDMAP_DATA) && window.MINDMAP_DATA.length > 0) {
          const hierarchy = buildHierarchy(window.MINDMAP_DATA);
          if (hierarchy) {
            setData(hierarchy);
            setSource('Sheet (Injected)');
            setLoading(false);
            return;
          }
        }

        // 2. Try loading local data.json (Dev mode)
        try {
          const response = await fetch('./data.json');
          if (response.ok) {
            const payload = await response.json();
            const nodes = Array.isArray(payload) ? payload : (payload.nodes || []);

            if (nodes.length > 0) {
              const hierarchy = buildHierarchy(nodes);
              if (hierarchy) {
                setData(hierarchy);
                setSource('Local data.json');
                if (payload.timestamp) setLastSync(new Date(payload.timestamp).toLocaleTimeString());
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Local data.json not available.");
        }
        
        setData(buildHierarchy(defaultData));
        setSource('Fallback (Code)');
      } catch (err) {
        console.error("Critical Load Error:", err);
        setData(buildHierarchy(defaultData));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-blue-200">
            <i className="fas fa-project-diagram text-sm"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Knowledge Explorer</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Knowledge Explorer</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-end">
            <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${source === 'Sheet (Injected)' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              Source: {source}
            </div>
            {lastSync && <div className="text-[10px] text-slate-400 mt-0.5">Sync: {lastSync}</div>}
          </div>
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
             <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Compiling Nodes</p>
             </div>
          </div>
        ) : (
          data && <MindMap data={data} />
        )}
      </main>
    </div>
  );
};

export default App;
