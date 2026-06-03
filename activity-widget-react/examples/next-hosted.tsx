import { ActivityWidget } from '../src/index'

export default function ExampleHostedWidget() {
  return (
    <ActivityWidget
      publicId="your-public-id"
      baseUrl="https://your-claude-leaderboard-instance.com"
      preset="paper"
      theme={{
        frame: '#f8fafc',
        chipBorder: '#cbd5e1',
        activityScale: ['#e2e8f0', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'],
      }}
    />
  )
}
