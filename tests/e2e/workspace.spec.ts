import {test,expect} from '@playwright/test';
const origin='http://127.0.0.1:3100';
const password='test password with enough length';
test('public routes, authentication, tenant isolation, CRUD, password revocation and lead submission',async({page,browser,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/en/dashboard');await expect(page).toHaveURL(/\/en\/login$/);
 expect((await request.get('/api/workspace')).status()).toBe(401);
 expect((await request.post('/api/auth/login',{headers:{Origin:'https://untrusted.example'},data:{email:'a@example.test',password}})).status()).toBe(403);
 await page.goto('/en/register');
 await page.getByLabel('Your Name',{exact:true}).fill('Alice Example');await page.getByLabel('Business Name',{exact:true}).fill('Pilot Workshop');
 await page.getByLabel('Email',{exact:true}).fill('alice-e2e@example.test');await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Create Account',exact:true}).click();
 await expect(page).toHaveURL(/\/en\/dashboard$/);await expect(page.getByRole('heading',{name:'Pilot Workshop'})).toBeVisible();
 const cookies=await page.context().cookies();const session=cookies.find(c=>c.name==='replylocal_session');expect(session?.httpOnly).toBe(true);expect(session?.sameSite).toBe('Lax');
 await page.goto('/en/knowledge');await page.getByRole('button',{name:'Add entry',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Free inspection');await page.getByLabel('Description, terms or answer').fill('Visual inspection by prior appointment.');await page.getByLabel('Price (optional)',{exact:true}).fill('0');
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Free inspection',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Free inspection',{exact:true})).toBeVisible();
 const workspace=await (await page.request.get('/api/workspace')).json();const entry=workspace.entries[0];expect(entry.price).toBe(0);
 // Separate browser session: second company cannot access the first company's records.
 const other=await browser.newContext();const r=other.request;
 expect((await r.post(`${origin}/api/auth/register`,{headers:{Origin:origin},data:{name:'Bob Example',companyName:'Other Workshop',email:'bob-e2e@example.test',password}})).status()).toBe(201);
 const otherWorkspace=await(await r.get(`${origin}/api/workspace`)).json();expect(otherWorkspace.entries).toHaveLength(0);
 expect((await r.delete(`${origin}/api/knowledge/${entry.id}`,{headers:{Origin:origin},data:{version:entry.version}})).status()).toBe(404);
 expect((await r.patch(`${origin}/api/knowledge/${entry.id}`,{headers:{Origin:origin},data:{kind:entry.kind,title:entry.title,content:entry.content,price:entry.price,currency:entry.currency,durationMinutes:entry.durationMinutes,sku:entry.sku,version:entry.version}})).status()).toBe(404);
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Updated inspection');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Updated inspection',{exact:true})).toBeVisible();
 expect((await page.request.delete(`/api/knowledge/${entry.id}`,{headers:{Origin:origin},data:{version:entry.version}})).status()).toBe(409);
 await page.goto('/en/settings');await page.getByLabel('Company name',{exact:true}).fill('Updated Workshop');await page.getByLabel('Instructions for the assistant').fill('Use verified facts.');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Saved to your workspace',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Company name',{exact:true})).toHaveValue('Updated Workshop');await expect(page.getByLabel('Instructions for the assistant')).toHaveValue('Use verified facts.');
 // Mobile layout: navigation and forms remain accessible.
 await page.setViewportSize({width:390,height:844});await expect(page.getByLabel('Company name',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/settings-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto('/en/knowledge');await page.screenshot({path:'test-results/knowledge-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();await expect(page.getByText('Updated inspection',{exact:true})).toHaveCount(0);
 await page.goto('/en/settings');await page.getByLabel('Current password',{exact:true}).fill(password);await page.getByLabel('New password',{exact:true}).fill('another sufficiently long password');await page.getByRole('button',{name:'Change password',exact:true}).click();await expect(page).toHaveURL(/\/en\/login$/);expect((await page.request.get('/api/workspace')).status()).toBe(401);
 await page.getByLabel('Email',{exact:true}).fill('alice-e2e@example.test');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Incorrect email or password'})).toBeVisible();
 await page.getByLabel('Password',{exact:true}).fill('another sufficiently long password');await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/en\/dashboard$/);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/en\/login$/);
 await page.goto('/en');await page.getByRole('button',{name:'Request pilot access',exact:true}).first().click();await page.getByLabel('Your Name',{exact:true}).fill('Potential Client');await page.getByLabel('Work Email',{exact:true}).fill('lead-e2e@example.test');await page.getByLabel('Phone or Telegram (@username)',{exact:true}).fill('@client');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Submit request',exact:true}).click();await expect(page.getByRole('heading',{name:'Request saved'})).toBeVisible();
 for(const locale of ['uk','ru','en']) {await page.goto(`/${locale}/login`);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
 await other.close();expect(errors).toEqual([]);
});
