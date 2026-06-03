import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const packageDir = path.join(projectRoot, 'packages', 'widget-react')
const cacheDir = path.join(projectRoot, '.npm-cache', 'widget-react')

const result = spawnSync(
  'npm',
  ['pack', '--dry-run', '--cache', cacheDir, packageDir],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_cache: cacheDir,
    },
  },
)

process.exit(result.status ?? 1)
