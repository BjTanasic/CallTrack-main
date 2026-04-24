import { PhoneMissed, MessageSquare, BarChart3, Zap, Bell, Users } from 'lucide-react';

const features = [
  {
    icon: PhoneMissed,
    title: 'Missed Call Detection',
    description: 'Instantly know when a call goes unanswered. Every missed call is logged with caller info, timestamp, and duration.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Auto SMS Follow-ups',
    description: 'Automatically send a personalized text message when a call is missed, so no lead ever falls through the cracks.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Users,
    title: 'Conversation Management',
    description: 'All SMS conversations in one place. Reply directly from the dashboard and keep full message history per contact.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    icon: BarChart3,
    title: 'Call Analytics',
    description: 'Track call volume, response rates, and messaging trends over time to understand your busiest hours and days.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'Live dashboard updates the moment a call comes in or a message is received. No manual refresh needed.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: Bell,
    title: 'Unread Badge Alerts',
    description: 'Visual indicators show exactly how many unread messages are waiting, so nothing gets buried or forgotten.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
];

export default function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-16">
        <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
          Everything you need to stay on top
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Built for small businesses that can't afford to miss a single customer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, description, color, bg, border }) => (
          <div
            key={title}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4`}>
              <Icon size={20} className={color} />
            </div>
            <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
