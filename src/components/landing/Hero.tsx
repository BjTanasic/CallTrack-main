import { Phone, ArrowRight, CheckCircle2, MessageSquare, PhoneMissed } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
  waitlistMode?: boolean;
}

export default function Hero({ onGetStarted, waitlistMode = false }: HeroProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <header className="relative px-6 md:px-12 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Phone size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CallTrack</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-slate-400 hover:text-white text-sm transition-colors">Features</a>
          <a href="#how-it-works" className="text-slate-400 hover:text-white text-sm transition-colors">How it works</a>
          <a href="#pricing" className="text-slate-400 hover:text-white text-sm transition-colors">Pricing</a>
        </nav>
        <button
          onClick={onGetStarted}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {waitlistMode ? 'Join waitlist' : 'Get started free'}
        </button>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-300 text-sm font-medium">Powered by Twilio</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Never miss a
          <br />
          <span className="text-blue-400">business call</span> again
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          CallTrack automatically tracks missed calls, sends SMS follow-ups, and manages all your customer conversations in one clean dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <button
            onClick={onGetStarted}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 text-base transition-all hover:shadow-lg hover:shadow-blue-600/25 active:scale-95"
          >
            {waitlistMode ? 'Join the waitlist' : 'Start for free'}
            <ArrowRight size={18} />
          </button>
          <a
            href="#how-it-works"
            className="text-slate-300 hover:text-white font-medium px-6 py-4 transition-colors text-base"
          >
            See how it works
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
          {['No credit card required', 'Setup in under 5 minutes', 'Cancel anytime'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-400 shrink-0" />
              <span>{t}</span>
            </div>
          ))}
        </div>

        <div className="mt-20 relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none z-10" />
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
            <div className="bg-slate-800/60 px-4 py-3 flex items-center gap-2 border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="text-slate-500 text-xs ml-2">CallTrack Dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Missed Today', value: '3', icon: PhoneMissed, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'Conversations', value: '12', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'SMS Sent', value: '47', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Calls This Week', value: '89', icon: Phone, color: 'text-sky-400', bg: 'bg-sky-500/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon size={16} className={color} />
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/30">
                  <p className="text-white text-sm font-medium">Recent Missed Calls</p>
                </div>
                {[
                  { number: '+1 (555) 012-3456', time: '2 min ago', sms: true },
                  { number: '+1 (555) 987-6543', time: '18 min ago', sms: true },
                  { number: 'John Smith', time: '1 hr ago', sms: false },
                ].map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between border-b border-slate-700/20 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <Phone size={12} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{item.number}</p>
                        <p className="text-slate-500 text-xs">{item.time}</p>
                      </div>
                    </div>
                    {item.sms && (
                      <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2.5 py-0.5">
                        SMS sent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
