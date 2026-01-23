import { main } from "./src/index.ts"

if (import.meta.main) {
  main().catch((error) => {
    console.error(String(error))
    process.exit(1)
  })
}
