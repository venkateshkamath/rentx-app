import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/passwordPolicy';

interface PasswordChecklistProps {
  password: string;
  context?: {
    email?: string;
    username?: string;
    name?: string;
  };
}

export default function PasswordChecklist({ password, context }: PasswordChecklistProps) {
  if (!password) return null;

  return (
    <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2.5">
      <p className="mb-2 text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Password must include</p>
      <div className="space-y-1.5">
        {PASSWORD_RULES.map(rule => {
          const passed = rule.test(password, context);
          return (
            <div key={rule.label} className={`flex items-center gap-2 text-xs font-700 ${passed ? 'text-brown-700' : 'text-brown-400'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${passed ? 'bg-brown-900 text-white' : 'bg-cream-200 text-brown-300'}`}>
                {passed ? <Check size={11} /> : <X size={10} />}
              </span>
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
