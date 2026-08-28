import { readdirSync, readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

const sourceRoots = ['src', 'test'].map((root) => resolve(root))
const sourceFiles = ['vitest.config.ts'].map((file) => resolve(file))
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts'])
const files = []

const collectFiles = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      collectFiles(path)
      continue
    }

    if (sourceExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
}

for (const root of sourceRoots) {
  collectFiles(root)
}

files.push(...sourceFiles)

if (files.length === 0) {
  throw new Error('Type-safety check found no TypeScript source files')
}

const forbiddenPatterns = [
  ['unsafe type assertion', /\bas\s+(?:unknown|any|never)\b/g],
  ['TypeScript suppression', /@ts-(?:ignore|expect-error|nocheck)\b/g],
  ['non-null assertion', /\b[A-Za-z_$][A-Za-z0-9_$]*!(?:\.|\?\.)|[)\]}]![.;,)]/g],
]
const findings = []

for (const file of files.sort()) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber]

    for (const [label, pattern] of forbiddenPatterns) {
      for (const match of line.matchAll(pattern)) {
        findings.push(`${relative(process.cwd(), file)}:${lineNumber + 1}: ${label}: ${match[0]}`)
      }
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'))
  process.exitCode = 1
} else {
  console.log(`type-safety check passed (${files.length} TypeScript files)`)
}
