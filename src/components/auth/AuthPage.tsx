import { Phone } from 'lucide-react';
import PhoneOtpForm from './PhoneOtpForm';

interface AuthPageProps {
  onShowLanding: () => void;
}

export default function AuthPage({ onShowLanding }: AuthPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="px-8 py-5 flex items-center">
        <button onClick={onShowLanding} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Phone size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CallTrack</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <PhoneOtpForm />
        </div>
      </div>
    </div>
  );
}
