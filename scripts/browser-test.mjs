import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'

const url = process.env.ATLAS_TEST_URL ?? 'http://127.0.0.1:4182/'
const out = process.env.ATLAS_QA_DIR ?? 'qa'
const tag = process.env.ATLAS_QA_ROUND ?? 'final'
const stage = process.env.ATLAS_QA_STAGE ?? 'all'
const args = ['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']
const engine = process.env.ATLAS_TEST_ENGINE ?? 'chromium'
const browser = engine==='webkit' ? await webkit.launch() : await chromium.launch({ channel:process.env.ATLAS_BROWSER_CHANNEL, args })
const report=[]
await mkdir(out,{recursive:true})
async function waitFor3D(page) {
  await page.locator('canvas.terrain-canvas').waitFor()
  await page.locator('button.terrain-marker[data-spot="ridge"]:visible').waitFor()
}
async function noOverflow(page, expected) {
  const result = await page.evaluate(() => ({
    scroll:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,
  }))
  assert.equal(result.viewport,expected)
  assert.ok(result.scroll <= result.viewport,`horizontal page overflow ${JSON.stringify(result)}`)
}
const transform=(page)=>page.locator('.terrain-marker[data-spot="ridge"]').evaluate(node=>node.style.transform)
try {
  for (const [width,height] of [[375,812],[390,844],[430,932],[768,1024],[1440,900]]) {
    const phone = width<500
    const context=await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone,deviceScaleFactor:1,
      reducedMotion:stage==='all'?'no-preference':'reduce'})
    const page=await context.newPage()
    const failures=[]
    page.on('pageerror',error=>failures.push(error.message))
    page.on('response',response=>{ if (response.status()>=400) failures.push(`${response.status()}: ${response.url()}`) })
    await page.goto(url,{waitUntil:'networkidle'})
    await waitFor3D(page)
    if (stage==='all') await page.waitForTimeout(930)
    await noOverflow(page,width)
    await page.screenshot({path:`${out}/${tag}-${width}x${height}.png`})
    if (width===390 || width===1440) {
      const story=page.locator('#stories')
      await story.scrollIntoViewIfNeeded()
      await story.locator('img').evaluate(img=>img.decode())
      await story.screenshot({path:`${out}/${tag}-story-${width}.png`})
      const routes=page.locator('#routes')
      await routes.scrollIntoViewIfNeeded()
      await routes.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())))
      await routes.screenshot({path:`${out}/${tag}-routes-${width}.png`})
      await page.evaluate(()=>window.scrollTo(0,0))
      await page.waitForTimeout(500)
    }
    if (stage==='all' && engine==='chromium') {
      const canvas=await page.locator('.terrain-canvas').boundingBox()
      const start=await transform(page)
      const x=Math.round(canvas.x+canvas.width*.40), y=Math.round(canvas.y+canvas.height*.76)
      if (phone) {
        const cdp=await context.newCDPSession(page)
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
        for (let step=1;step<=5;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+step*10,y:y-2*step}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
      } else {
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+68,y-15,{steps:5});await page.mouse.up()
      }
      await page.waitForFunction(previous=>document.querySelector('.terrain-marker[data-spot="ridge"]').style.transform!==previous,start)
      if (phone) assert.ok(await page.evaluate(()=>scrollY)<5)
      await page.getByRole('button',{name:'恢复默认视角'}).click()
      await page.waitForTimeout(765)
      if (phone) {
        const cdp=await context.newCDPSession(page)
        const beforePinch=await transform(page)
        const centerX=Math.round(canvas.x+canvas.width*.49), centerY=Math.round(canvas.y+canvas.height*.70)
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:centerX-23,y:centerY,id:1},{x:centerX+23,y:centerY,id:2}]})
        for (let step=1;step<=5;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:centerX-23-6*step,y:centerY,id:1},{x:centerX+23+6*step,y:centerY,id:2}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        await page.waitForFunction(previous=>document.querySelector('.terrain-marker[data-spot="ridge"]').style.transform!==previous,beforePinch)
        await page.getByRole('button',{name:'恢复默认视角'}).click()
        await page.waitForTimeout(765)
      }
      await page.locator('button.terrain-marker[data-spot="sun"]').click()
      const drawer=page.getByRole('dialog',{name:'中山陵'})
      await drawer.waitFor()
      assert.ok((await drawer.getByRole('link',{name:'导航至博爱坊'}).getAttribute('href')).includes('coordinate=wgs84'))
      await drawer.getByRole('button',{name:'收藏景点'}).click()
      assert.equal(await drawer.getByRole('button',{name:'取消收藏'}).getAttribute('aria-pressed'),'true')
      if (phone) {
        const handle=await drawer.locator('.drawer-handle').boundingBox()
        const cdp=await context.newCDPSession(page)
        const x=Math.round(handle.x+handle.width/2), y=Math.round(handle.y+handle.height/2)
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-55}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
      } else {
        await drawer.getByRole('button',{name:'展开详情',exact:true}).first().click()
      }
      await drawer.getByRole('heading',{name:'在这里看什么'}).waitFor()
      await drawer.getByRole('button',{name:'下一张图片'}).click()
      if (width===390) await page.screenshot({path:`${out}/${tag}-drawer-mobile.png`})
      await drawer.getByRole('button',{name:'查看在山上的位置'}).click()
      await drawer.waitFor({state:'hidden'})
      await page.getByRole('button',{name:'二维地图'}).click()
      const map=page.locator('.flat-map')
      await map.waitFor()
      const selected=map.locator('.map-pin.is-selected')
      await selected.waitFor()
      assert.equal(await selected.getAttribute('title'),'中山陵')
      await page.getByRole('button',{name:'筛选景点'}).click()
      await page.locator('.map-filter').getByRole('button',{name:'科学文化'}).click()
      assert.equal(await map.locator('.map-pin').count(),1)
      await page.getByRole('button',{name:'恢复默认视角'}).click()
      await page.waitForTimeout(350)
      await page.locator('[data-route="hike"]').click()
      await page.getByRole('dialog',{name:'山林徒步'}).waitFor()
      await page.getByRole('button',{name:'查看山上线路'}).click()
      await waitFor3D(page)
      await page.getByRole('button',{name:'二维地图'}).click()
      await page.locator('.flat-map .leaflet-routes-pane canvas').waitFor()
      await page.waitForTimeout(450)
      if (width===390) await page.screenshot({path:`${out}/${tag}-route-map-390.png`})
      await page.getByRole('button',{name:'恢复默认视角'}).click()
      await page.getByRole('button',{name:'筛选景点'}).click()
      await page.locator('.map-filter').getByRole('button',{name:'全部'}).click()
      await page.waitForTimeout(450)
      if (width===390 || width===1440) await page.screenshot({path:`${out}/${tag}-map-${width}.png`})
      const mapBounds=await map.boundingBox()
      if (phone) {
        const cdp=await context.newCDPSession(page)
        const x=Math.round(mapBounds.x+mapBounds.width*.32), y=Math.round(mapBounds.y+mapBounds.height*.61)
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
        for (let step=1;step<=5;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+9*step,y:y+2*step}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        await map.locator('xpath=self::*[@data-interacted="true"]').waitFor()
      }
      await context.setGeolocation({latitude:32.0605,longitude:118.8189,accuracy:20})
      await context.grantPermissions(['geolocation'])
      await page.getByRole('button',{name:'获取我的位置'}).click()
      await page.getByText('已定位',{exact:false}).waitFor()
      await page.getByRole('button',{name:'清除我的位置'}).click()
      await noOverflow(page,width)
      await page.reload({waitUntil:'networkidle'})
      await page.getByRole('button',{name:/我的收藏/}).click()
      assert.equal(await page.locator('.saved-menu').getByRole('button',{name:'中山陵'}).count(),1)
    }
    assert.deepEqual(failures,[])
    report.push({viewport:[width,height],touch:phone,passed:true})
    await context.close()
  }
  if (stage==='all' && engine==='chromium') {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,permissions:[]})
    await context.addInitScript(() => {
      const original=HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext=function(type,...args) {
        if (String(type).includes('webgl')) return null
        return original.call(this,type,...args)
      }
    })
    const page=await context.newPage()
    await page.goto(url)
    await page.locator('.flat-map').waitFor()
    assert.equal(await page.getByRole('button',{name:'三维沙盘'}).isDisabled(),true)
    assert.equal(await page.getByRole('button',{name:'二维地图'}).getAttribute('aria-pressed'),'true')
    await page.getByRole('button',{name:'获取我的位置'}).click()
    await page.getByText('未获定位权限，仍可浏览地图。',{exact:true}).waitFor()
    report.push({fallback:'No WebGL and geolocation denied',passed:true})
    await context.close()
  }
  await writeFile(`${out}/${tag}-report.json`,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
} finally { await browser.close() }
