import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/20 border-red-500/30 text-red-300',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
};

export function Toast({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id} className={`toast flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${COLORS[t.type]}`}>
            <Icon className="w-4 h-4 shrink-0" />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
