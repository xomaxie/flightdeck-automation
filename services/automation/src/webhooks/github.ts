import { createHmac, timingSafeEqual } from "node:crypto"

export function verifySignature(secret: string, body: string, signature?: string) {
  if (!signature) return false
  const digest = "sha256=" + createHmac("sha256", secret).update(body).digest("hex")
  if (signature.length !== digest.length) return false
  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

export function mapGithubEvent(event: string, payload: any) {
  if (event === "pull_request" && payload.action === "opened") return "pull_request.opened"
  if (event === "pull_request" && payload.action === "synchronize") return "pull_request.synchronize"
  if (event === "issue_comment" && payload.action === "created") return "issue_comment.created"
  return null
}
