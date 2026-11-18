import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Power, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import {
  robotSettingsQuery,
  saveRobotSettings,
  type RobotSettings,
} from "@/lib/robot-settings";
import { tradingAccountQuery } from "@/lib/trading-account";
import { appAccessQuery } from "@/lib/app-access";
import { cn } from "@/lib/utils";
import { igniteApp } from "@/lib/ignite";

// Stays with the customer wherever they are in the app, so the robot can be
// started without first opening the Robot tab.
export function FloatingStartButton() {
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: settings } = useQuery(robotSettingsQuery);
  const { data: account } = useQuery(tradingAccountQuery);
  const { data: hasAppAccess, isLoading: accessLoading } = useQuery(appAccessQuery);

  const running = settings?.is_running ?? false;
  const heartbeatAt = account?.last_heartbeat ? new Date(account.last_heartbeat).getTime() : 0;
  const connected = account?.status === "connected" && Number.isFinite(heartbeatAt) && Date.now() - heartbeatAt >= 0 && Date.now() - heartbeatAt < 30_000;
  const canStart = hasAppAccess === true && connected;

  const toggle = useMutation({
    mutationFn: () => saveRobotSettings({ is_running: !running }),
    onMutate: async () => {
      if (!running) igniteApp();
      await qc.cancelQueries({ queryKey: robotSettingsQuery.queryKey });
      const previous = qc.getQueryData<RobotSettings>(robotSettingsQuery.queryKey);
      if (previous) {
        qc.setQueryData(robotSettingsQuery.queryKey, { ...previous, is_running: !running });
      }
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(robotSettingsQuery.queryKey, context.previous);
      }
      toast.error(error.message || "Could not update the robot. Try again.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: robotSettingsQuery.queryKey });
    },
  });

  // The Robot tab already carries a full-size start/stop control at the top.
  if (pathname === "/control") return null;

  const pending = toggle.isPending;

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={pending}
      aria-label={running ? "Stop the robot" : "Start the robot"}
      className={cn(
        "fixed bottom-[86px] right-5 z-30 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors sm:gap-2 sm:px-5 sm:py-3 sm:text-sm md:right-7",
        running
          ? "start-live border border-primary/50 bg-card text-foreground"
          : "bg-primary text-primary-foreground shadow-glow",
        pending && "opacity-70",
      )}
    >
      {pending ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : running ? (
        <Square className="h-4 w-4 fill-current" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      {pending ? "Sending…" : running ? "Stop robot" : "Start robot"}
      <span
        aria-hidden
        className={cn(
          "ml-0.5 h-2 w-2 rounded-full",
          connected ? "bg-profit" : "bg-muted-foreground/50",
        )}
      />
    </button>
  );
}
