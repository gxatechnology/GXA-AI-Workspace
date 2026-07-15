import React, { useState } from 'react';
import { 
  Database, 
  CloudLightning, 
  RefreshCw, 
  Download, 
  HardDrive, 
  List, 
  Flame, 
  Zap, 
  Terminal, 
  CheckCircle,
  FileText,
  MessageSquare,
  Image,
  Layers
} from 'lucide-react';

interface CloudFile {
  name: string;
  type: 'doc' | 'chat' | 'image' | 'pdf';
  size: string;
  bytes: number;
  project: string;
}

export default function StorageView() {
  const [isCompacting, setIsCompacting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');
  const [logs, setLogs] = useState<string[]>([
    'LOG [14:48:10]: Connected to Express micro-gateway on port 3000.',
    'LOG [14:48:12]: Checked version diff with cloud db.json. Sync offset 0.',
    'LOG [14:50:35]: Sync complete. Pushed 1 local revision payload.',
    'LOG [14:52:00]: Heartbeat check: roundtrip latency 42ms. Zero conflicts.'
  ]);

  const files: CloudFile[] = [
    { name: 'competitor_marketing_audit_v2.pdf', type: 'pdf', size: '12.4 MB', bytes: 13002340, project: 'Q3 Launch' },
    { name: 'annual_sales_proposal.md', type: 'doc', size: '12 KB', bytes: 12288, project: 'Client Proposals' },
    { name: 'lead_outreach_campaign.md', type: 'doc', size: '15 KB', bytes: 15360, project: 'Marketing Assets' },
    { name: 'Chat_about_NextJS_Router_Logic.json', type: 'chat', size: '22 KB', bytes: 22528, project: 'Development' },
    { name: 'gxa_product_shot_hero_banner.png', type: 'image', size: '2.4 MB', bytes: 2516582, project: 'Design Hub' }
  ];

  const handleCompact = () => {
    setIsCompacting(true);
    setLogs(prev => [...prev, `LOG [${new Date().toLocaleTimeString()}]: Triggering index optimization...`]);
    setTimeout(() => {
      setIsCompacting(false);
      setLogs(prev => [
        ...prev, 
        `LOG [${new Date().toLocaleTimeString()}]: Local storage garbage collected. Saved 4.2 MB.`
      ]);
    }, 1500);
  };

  const handleManualSync = () => {
    setSyncStatus('syncing');
    setLogs(prev => [...prev, `LOG [${new Date().toLocaleTimeString()}]: Querying central workspace database endpoint...`]);
    setTimeout(() => {
      setSyncStatus('synced');
      setLogs(prev => [
        ...prev, 
        `LOG [${new Date().toLocaleTimeString()}]: Synchronized 100% of files. Synced payload: OK.`
      ]);
    }, 1200);
  };

  const handleExportBackup = () => {
    const backupContent = JSON.stringify({ backup_version: '1.0', files, timestamp: new Date() }, null, 2);
    const blob = new Blob([backupContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gxa-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left font-sans">
      
      {/* LEFT COLUMN: Storage usage + largest files (Col span 7) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Usage Overview */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
            <HardDrive className="h-5 w-5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Workspace Capacity</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-850/60 text-xs font-bold text-slate-600 dark:text-zinc-400">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Storage Used</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">14.8 MB</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">780 Files Cached</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-850/60 text-xs font-bold text-slate-600 dark:text-zinc-400">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Available Limit</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">2.0 GB</span>
              <span className="text-[10px] text-teal-500 font-mono block mt-1">Upgrade for Unlimited</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-850/60 text-xs font-bold text-slate-600 dark:text-zinc-400">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Indexed Items</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">1,420</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">Automatic sync ok</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-zinc-400">
              <span>Overall Consumption</span>
              <span>0.7% Space Used</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: '0.7%' }} />
            </div>
          </div>
        </div>

        {/* Largest files list */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
            <List className="h-5 w-5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Quota-heavy files</span>
          </div>

          <div className="border border-slate-100 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850 text-xs font-bold text-slate-700 dark:text-zinc-300">
            {files.map((file, idx) => {
              const Icon = file.type === 'doc' ? FileText : file.type === 'chat' ? MessageSquare : Image;
              return (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-white/40 dark:bg-zinc-900/40 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4.5 w-4.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-slate-900 dark:text-zinc-100 block truncate font-bold text-xs">
                        {file.name}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        Project: {file.project}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-zinc-300 font-mono shrink-0">
                    {file.size}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Syncer Status Logs + System Actions (Col span 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Quick Operations */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
            <Flame className="h-5 w-5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Workspace Operations</span>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/[0.04] text-xs font-bold rounded-xl text-slate-700 dark:text-zinc-300 transition"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 text-teal-500 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Synchronize Cloud Database</span>
              </span>
              <span className="text-[10px] uppercase font-black text-teal-500 tracking-wider">
                {syncStatus === 'syncing' ? 'Syncing...' : 'Ready'}
              </span>
            </button>

            <button
              onClick={handleCompact}
              disabled={isCompacting}
              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/[0.04] text-xs font-bold rounded-xl text-slate-700 dark:text-zinc-300 transition"
            >
              <span className="flex items-center gap-2">
                <Layers className={`h-4 w-4 text-teal-500 ${isCompacting ? 'animate-pulse' : ''}`} />
                <span>Compact Local Index Cache</span>
              </span>
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                {isCompacting ? 'Cleaning...' : 'Optimize'}
              </span>
            </button>

            <button
              onClick={handleExportBackup}
              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/[0.04] text-xs font-bold rounded-xl text-slate-700 dark:text-zinc-300 transition"
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-500" />
                <span>Export Offline Workspace Backup</span>
              </span>
              <span className="text-[10px] uppercase font-black text-teal-500 tracking-wider">
                JSON
              </span>
            </button>
          </div>
        </div>

        {/* Real-time sync logs terminal */}
        <div className="bg-slate-900 text-teal-400 border border-zinc-800 p-5 rounded-2xl space-y-3 font-mono text-[10px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase">
              <Terminal className="h-4 w-4 text-teal-500" /> Syncer Core Terminal
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-teal-500 animate-ping" />
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-none select-text text-left leading-relaxed">
            {logs.map((log, idx) => (
              <div key={idx} className="hover:bg-zinc-850/50 p-1 rounded transition">
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
