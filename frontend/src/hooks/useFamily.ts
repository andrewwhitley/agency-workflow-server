import { useState, useEffect, useCallback } from 'react';
import type { FamilyMember } from '../types';
import { getFamily } from '../api';

export function useFamily() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getFamily();
      setMembers(data);
      if (!activeMember && data.length > 0) {
        setActiveMember(data[0]);
      } else if (activeMember) {
        const updated = data.find((m) => m.id === activeMember.id);
        if (updated) setActiveMember(updated);
      }
    } catch (err) {
      console.error('Failed to load family:', err);
    } finally {
      setLoading(false);
    }
  }, [activeMember]);

  useEffect(() => { refresh(); }, []);

  return { members, activeMember, setActiveMember, loading, refresh };
}
