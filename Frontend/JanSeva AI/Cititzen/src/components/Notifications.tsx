import { useState } from "react";
import { Bell, Check, CheckCircle2, Info, MessageSquare, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n";

type NotificationType = "status" | "ai" | "system" | "message";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: NotificationType;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "Complaint Resolved",
    message: "Your complaint #JANSEVA-8239 regarding street light malfunction has been successfully resolved.",
    time: "2 hours ago",
    read: false,
    type: "status",
  },
  {
    id: "2",
    title: "AI Smart Merge",
    message: "Our AI detected 3 similar reports in your area for water logging. We have merged them to prioritize immediate action.",
    time: "5 hours ago",
    read: false,
    type: "ai",
  },
  {
    id: "3",
    title: "Action In Progress",
    message: "The municipal team has been dispatched to address your sanitation complaint.",
    time: "1 day ago",
    read: true,
    type: "status",
  },
  {
    id: "4",
    title: "New Message from Official",
    message: "'We have procured the necessary materials. Work starts tomorrow.'",
    time: "2 days ago",
    read: true,
    type: "message",
  },
];

const iconMap = {
  status: <CheckCircle2 className="h-5 w-5 text-india-green" />,
  ai: <Sparkles className="h-5 w-5 text-saffron" />,
  system: <Info className="h-5 w-5 text-blue-500" />,
  message: <MessageSquare className="h-5 w-5 text-purple-500" />,
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const t = useT();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t.header.notifications}
          className="relative rounded-full p-1.5 text-foreground transition-colors hover:bg-secondary sm:p-2"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-saffron sm:h-2.5 sm:w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron opacity-75"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-xl sm:w-[420px] z-50">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-xs font-medium text-saffron">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[60vh] sm:max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex items-start gap-4 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50 last:border-0 ${
                    !n.read ? "bg-secondary/30" : ""
                  }`}
                >
                  <div className="mt-1 shrink-0 rounded-full bg-background p-1.5 shadow-sm">
                    {iconMap[n.type]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground/80">{n.time}</span>
                    </div>
                    <p className={`text-sm ${!n.read ? "text-foreground/90" : "text-muted-foreground"}`}>
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-2 shrink-0">
                      <span className="block h-2 w-2 rounded-full bg-saffron" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <button
            className="w-full rounded-md py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
