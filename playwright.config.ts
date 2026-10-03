import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/ui',
 fullyParallel:false,
 use:{channel:'chrome',headless:true,trace:'retain-on-failure'},
 webServer:{
  command:'npm run dev -- --port 3100',
  url:'http://localhost:3100/live',
  reuseExistingServer:true,
  env:{LOCAL_DEMO:'true',NEXT_PUBLIC_BACKEND:'local',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',NEXT_PUBLIC_BASE_PATH:''},
 },
});
