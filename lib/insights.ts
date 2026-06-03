import { unstable_cache } from 'next/cache'
import { type InsightPeriod, type TeamInsights } from './insights-core.ts'
import { queryTeamInsights } from './insights-query.ts'

export const getTeamInsights = unstable_cache(
  queryTeamInsights,
  ['team-insights'],
  { revalidate: 300, tags: ['leaderboard', 'insights'] },
)

export { buildTeamInsights, emptyTeamInsights, isInsightPeriod } from './insights-core.ts'
export { queryTeamInsights } from './insights-query.ts'
export type { InsightPeriod, TeamInsights } from './insights-core.ts'
