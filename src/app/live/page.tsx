import { Conversation } from "@/components/desk/conversation";
import { LeadCard } from "@/components/desk/lead-card";
import { LeadsTable } from "@/components/desk/leads-table";
import { TopBar } from "@/components/desk/top-bar";
import { LiveDeskProvider } from "@/lib/store";

export const metadata = { title: "Live sales desk", robots: { index: false } };

// Real WhatsApp conversations (password-protected by src/proxy.ts). No demo scenarios here.
export default function Live() {
  return (
    <LiveDeskProvider>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <TopBar />
        <p data-testid="live-banner" className="border-b bg-success/10 px-4 py-2 text-xs text-success">
          Live WhatsApp desk: real conversations on the Meta test number. Not synthetic.
        </p>
        <main className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <LeadsTable />
          <div className="min-h-[420px] lg:min-h-0">
            <Conversation />
          </div>
          <LeadCard />
        </main>
      </div>
    </LiveDeskProvider>
  );
}
