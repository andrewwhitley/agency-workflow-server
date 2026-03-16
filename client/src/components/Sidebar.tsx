import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Workflow } from "lucide-react";

interface User {
  name: string;
  email: string;
  picture: string;
}

const navItems = [
  { to: "/workflows", label: "Workflows", icon: Workflow },
];

export function Sidebar({ user }: { user: User | null }) {
  return (
    <aside className="flex flex-col bg-surface border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">
          Agency Command Center
        </h1>
        <p className="text-xs text-dim mt-0.5">AI Marketing Team</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        {/* Link back to legacy dashboard */}
        <a
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-dim hover:bg-surface-2 hover:text-foreground transition-colors mt-4"
        >
          &larr; Legacy Dashboard
        </a>
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
