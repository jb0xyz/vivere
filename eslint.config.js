import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.vivere/**'] },
  ...tseslint.configs.recommended,
)
