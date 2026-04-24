const steps = [
  {
    number: '01',
    title: 'Connect your Twilio number',
    description: 'Link your existing Twilio phone number to CallTrack in under 2 minutes. No technical knowledge required.',
  },
  {
    number: '02',
    title: 'Calls are tracked automatically',
    description: 'Every incoming call — whether answered, missed, or voicemail — is instantly logged with full details.',
  },
  {
    number: '03',
    title: 'Auto SMS fires on missed calls',
    description: 'When a call goes unanswered, CallTrack automatically sends a friendly follow-up text to the caller.',
  },
  {
    number: '04',
    title: 'Manage replies from your dashboard',
    description: 'See all inbound SMS replies in one place and respond directly without leaving CallTrack.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-900/50 border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24">
        <div className="text-center mb-16">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Up and running in minutes
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Four simple steps to never miss a customer again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-slate-700 to-transparent -translate-x-4 z-0" />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <span className="text-blue-400 font-bold text-sm">{step.number}</span>
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
