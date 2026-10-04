import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',workers:1,timeout:60000,
 use:{launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS??'[]')}:undefined,baseURL:'http://127.0.0.1:3100',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
 reporter:'list',
});
