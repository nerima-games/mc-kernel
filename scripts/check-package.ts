import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkDirectory = await mkdtemp(path.join(tmpdir(), 'mc-kernel-package-check-'))

try {
  await execFile('pnpm', ['pack', '--pack-destination', checkDirectory], { cwd: repositoryRoot })

  const tarball = (await readdir(checkDirectory)).find((fileName) => fileName.endsWith('.tgz'))
  if (tarball === undefined) {
    throw new Error('pnpm pack did not produce a tarball')
  }

  await writeFile(
    path.join(checkDirectory, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies: {
          '@nerima-games/mc-kernel': `file:${path.join(checkDirectory, tarball)}`,
        },
      },
      null,
      2,
    )}\n`,
  )
  await execFile('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile'], { cwd: checkDirectory })

  await writeFile(
    path.join(checkDirectory, 'consumer.ts'),
    "import { type BlockPositionKey, CHUNK_SIZE_XZ } from '@nerima-games/mc-kernel'\n\ndeclare const key: BlockPositionKey\nvoid key\nvoid CHUNK_SIZE_XZ\n",
  )
  await writeFile(
    path.join(checkDirectory, 'tsconfig.json'),
    '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","noEmit":true,"strict":true},"include":["consumer.ts"]}\n',
  )

  await execFile(process.execPath, ['--input-type=module', '--eval', "import { CHUNK_SIZE_XZ } from '@nerima-games/mc-kernel'; if (CHUNK_SIZE_XZ !== 16) throw new Error('invalid package export')"], {
    cwd: checkDirectory,
  })
  await execFile('pnpm', ['exec', 'tsc', '-p', path.join(checkDirectory, 'tsconfig.json'), '--pretty', 'false'], {
    cwd: repositoryRoot,
  })
} finally {
  await rm(checkDirectory, { recursive: true, force: true })
}
