export async function postSlackMessage(webhookUrl: string, text: string) {
  await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })
}
