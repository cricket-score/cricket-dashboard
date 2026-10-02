import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [...compat.extends('next/core-web-vitals', 'next/typescript'), {ignores:['next-env.d.ts','.next/**','.pages-build/**','supabase/functions/**','node_modules/**','playwright-report/**','test-results/**']}, {rules:{'@next/next/no-img-element':'off'}}];
export default config;
