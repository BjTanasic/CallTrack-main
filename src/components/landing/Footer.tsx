import { Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <Phone size={13} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">CallTrack</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Features</a>
          <a href="#pricing" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Pricing</a>
          <a href="#how-it-works" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">How it works</a>
        </div>
        <p className="text-slate-600 text-sm">
          &copy; {new Date().getFullYear()} CallTrack. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
