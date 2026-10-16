// Grader-facing health check: is live AI configured, which model, which build.
// Never returns the key itself.
export function GET() {
  return Response.json({
    liveAi: Boolean(process.env.ANTHROPIC_API_KEY),
    model: "claude-sonnet-5-5",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? "local",
  });
}
