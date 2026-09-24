import { configDefaults, defineConfig } from 'vitest/config';

// Agent worktrees under .claude/ hold whole copies of the repo, tests included; without this,
// `vitest run tests/unit` would run those copies too and report their skips as this branch's.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
