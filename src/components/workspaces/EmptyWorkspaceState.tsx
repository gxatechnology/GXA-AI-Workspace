import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyWorkspaceState({ title, description }: { title: string; description: string }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center"><section className="w-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900"><Inbox className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-5 text-xl font-black">{title}</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p></section></div>;
}
