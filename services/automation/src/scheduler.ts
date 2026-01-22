import type { AutomationConfig } from "./types"
import { Cron } from "croner"

export function shouldRegisterSchedule(taskId: string, tasks: AutomationConfig["tasks"]) {
  return Boolean(tasks[taskId])
}

export function registerSchedules(config: AutomationConfig, onRun: (taskId: string) => void) {
  const schedules = config.schedules ?? []
  return schedules.map((schedule) => {
    if (!shouldRegisterSchedule(schedule.taskId, config.tasks)) return null
    return Cron(schedule.cron, () => onRun(schedule.taskId))
  })
}
