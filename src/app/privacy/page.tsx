export const metadata = { title: "Privacy policy" };

// Required by Meta to publish the WhatsApp app. Kept to what the code actually does.
export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Privacy policy: franchise sales desk</h1>
      <p className="text-muted-foreground">Last updated 19 October 2026. Operated by Srijan Arya (srijanaryay@gmail.com).</p>
      <h2 className="font-semibold">What this is</h2>
      <p>
        A pilot WhatsApp sales desk. When you message its WhatsApp number, an AI assistant may reply, and a human consultant can take over
        the conversation. The public demo at the home page uses only made-up data.
      </p>
      <h2 className="font-semibold">What we collect</h2>
      <p>Your WhatsApp phone number, your WhatsApp profile name, and the messages you send to this number, with their times.</p>
      <h2 className="font-semibold">How it is used</h2>
      <p>
        Only to reply to you and to let a consultant see and continue the conversation. It is not sold, not used for advertising and not
        shared with anyone except the services below, which process it to run the desk.
      </p>
      <h2 className="font-semibold">Services that process it</h2>
      <ul className="list-disc pl-5">
        <li>Meta (WhatsApp Cloud API), which delivers the messages.</li>
        <li>Vercel, which hosts the app.</li>
        <li>Upstash (Redis), which stores the conversation.</li>
        <li>Anthropic (Claude), which drafts the AI replies from the recent messages.</li>
      </ul>
      <h2 className="font-semibold">Keeping and deleting it</h2>
      <p>
        Conversations are kept until they are deleted. To have yours deleted, or to ask what is held about you, email
        srijanaryay@gmail.com or send &quot;delete my data&quot; to the WhatsApp number.
      </p>
    </main>
  );
}
