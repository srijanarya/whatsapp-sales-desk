import { Conversation } from "@/components/desk/conversation";
import { LeadCard } from "@/components/desk/lead-card";
import { LeadsTable } from "@/components/desk/leads-table";
import { TopBar } from "@/components/desk/top-bar";
import { DeskProvider } from "@/lib/store";

export default function Home() {
  return (
    <DeskProvider>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <TopBar />
        <p data-testid="synthetic-banner" className="border-b bg-alert/10 px-4 py-2 text-xs text-alert">
          Brands as publicly listed on scale100x.ai (16 Oct 2026). All leads, conversations and metrics are synthetic.
          No affiliation.
        </p>
        <main className="grid flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <LeadsTable />
          <div className="min-h-[420px] lg:min-h-0">
            <Conversation />
          </div>
          <LeadCard />
        </main>
      </div>
    </DeskProvider>
  );
}
