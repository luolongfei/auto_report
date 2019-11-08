/**
 * 简单的截屏例子
 * @type {exports|*}
 */
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 2, // 此参数越大，截图质量越高，文件也越大，一般设置为2已经很好了
    });
    await page.goto('https://vip.com', {
        timeout: 33000, // 超时时间，单位为毫秒
        waitUntil: 'load'
    });
    await page.waitFor(2000); // 延迟两秒再截图，这里完全可以根据页面元素是否加载来判断，直接延迟毫秒不是最优解
    await page.screenshot({ path: 'example4.png' });

    await browser.close();
})();