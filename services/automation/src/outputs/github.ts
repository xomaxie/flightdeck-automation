import { Octokit } from "@octokit/rest"

export async function postGithubComment(token: string, repo: string, issueOrPrNumber: number, body: string) {
  const [owner, name] = repo.split("/")
  const client = new Octokit({ auth: token })
  await client.issues.createComment({ owner, repo: name, issue_number: issueOrPrNumber, body })
}
