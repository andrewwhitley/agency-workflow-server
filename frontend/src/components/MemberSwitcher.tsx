import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FamilyMember } from '../types';

interface Props {
  members: FamilyMember[];
  active: FamilyMember;
  onChange: (m: FamilyMember) => void;
}

export function MemberSwitcher({ members, active, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (members.length <= 1) {
    return (
      <div className="px-4 py-3 border-b border-dark-600">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: active.avatar_color }}
          >
            {active.name[0]}
          </div>
          <div>
            <div className="text-sm font-medium">{active.name}</div>
            <div className="text-xs text-gray-500">{active.role || 'Member'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-dark-600 relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: active.avatar_color }}
        >
          {active.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{active.name}</div>
          <div className="text-xs text-gray-500">{active.role || 'Member'}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-dark-700 border border-dark-500 rounded-lg shadow-xl z-10 py-1">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-dark-600 transition-colors
                ${m.id === active.id ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: m.avatar_color }}
              >
                {m.name[0]}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
