import { defineConfig } from '@playwright/test';
const project=process.env.RV_TEST_PROJECT||'demo-rinconcito-verde';
export default defineConfig({
 testDir:'./tests/admin-e2e',workers:1,fullyParallel:false,timeout:60000,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4174',headless:true,launchOptions:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']}},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',url:'http://127.0.0.1:4174',reuseExistingServer:false,env:{VITE_FIREBASE_MODE:'emulator',VITE_FIREBASE_PROJECT_ID:project,VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_AUTH_DOMAIN:project+'.firebaseapp.com',VITE_FIREBASE_STORAGE_BUCKET:project+'.appspot.com',VITE_FIREBASE_APP_ID:'demo-app',VITE_EMULATOR_AUTH_PORT:process.env.RV_TEST_AUTH_PORT||'19099',VITE_EMULATOR_FIRESTORE_PORT:process.env.RV_TEST_FIRESTORE_PORT||'18080',VITE_EMULATOR_STORAGE_PORT:process.env.RV_TEST_STORAGE_PORT||'19199',VITE_EMULATOR_FUNCTIONS_PORT:process.env.RV_TEST_FUNCTIONS_PORT||'15001'}}
});
