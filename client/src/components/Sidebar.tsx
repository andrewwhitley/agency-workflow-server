import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  LayoutDashboard, Workflow, Clock, Bot, CheckSquare, Brain,
  HardDrive, Users, FileText, PenTool, BookOpen, MessageCircle,
  Target, BarChart3, AlertCircle, Calendar, UserCheck, Megaphone,
  Globe, TrendingUp, Radar, FileSearch, Search, Lightbulb,
  Building2, Heart, Crosshair, ClipboardList,
} from "lucide-react";

interface User {
  name: string;
  email: string;
  picture: string;
}

const navSections = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/onboarding", label: "Client Onboarding", icon: ClipboardList },
      { to: "/weekly-check-in", label: "Weekly Check-In", icon: Heart },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/guides", label: "Marketing Guides", icon: FileText },
      { to: "/workbooks", label: "Workbooks", icon: BookOpen },
      { to: "/agents", label: "AI Agents", icon: Bot },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/team", label: "Agency Team", icon: Users },
      { to: "/workflows", label: "Workflows", icon: Workflow },
      { to: "/history", label: "Run History", icon: Clock },
      { to: "/drive", label: "Google Drive", icon: HardDrive },
      { to: "/sops", label: "SOPs", icon: FileText },
      { to: "/memories", label: "Memories", icon: Brain },
      { to: "/settings/traffic-light", label: "Traffic Light Config", icon: AlertCircle },
    ],
  },
  {
    label: "EOS",
    items: [
      { to: "/eos/rocks", label: "Rocks", icon: Target },
      { to: "/eos/scorecard", label: "Scorecard", icon: BarChart3 },
      { to: "/eos/issues", label: "Issues (IDS)", icon: AlertCircle },
      { to: "/eos/meetings", label: "L10 Meetings", icon: Calendar },
      { to: "/eos/people", label: "People", icon: UserCheck },
      { to: "/eos/headlines", label: "Headlines", icon: Megaphone },
    ],
  },
  {
    label: "Integrations",
    items: [
      { to: "/discord", label: "Discord Logs", icon: MessageCircle },
    ],
  },
];

const salesSection = {
  label: "Sales",
  items: [
    { to: "/sales/enrichment", label: "Prospect Enrichment", icon: Crosshair },
  ],
};

export function Sidebar({ user }: { user: User | null }) {
  const { isAdmin } = useIsAdmin();
  const sections = isAdmin ? [...navSections, salesSection] : navSections;

  return (
    <aside className="flex flex-col bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">
          Agency Command Center
        </h1>
        <p className="text-xs text-dim mt-0.5">AI Marketing Team</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-dim font-semibold px-3 mb-1">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <img
              src={user.picture}
              alt=""
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {user.name}
              </div>
              <div className="text-xs text-dim truncate">{user.email}</div>
            </div>
          </div>
          <a
            href="/auth/logout"
            className="block mt-2 text-xs text-dim hover:text-foreground transition-colors"
          >
            Sign out
          </a>
        </div>
      )}
    </aside>
  );
}
