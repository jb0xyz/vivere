import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    testing: 'src/testing/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
})
