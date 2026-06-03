import { mkdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
  })
}

const cacheLifeStub = '.next/types/cache-life.d.ts'

await rm('tsconfig.tsbuildinfo', { force: true })
await run('next', ['typegen'])
await mkdir('.next/types', { recursive: true })
await writeFile(cacheLifeStub, 'export {}\n', 'utf8')
await run('tsc', ['--noEmit'])
