/**
 * 自动周报机器人
 * 基于puppeteer控制谷歌无头浏览器，每周五执行填写并提交周报问卷的操作，
 * 吐槽一下puppeteer，puppeteer很强大，但是只能操作在可视区域内的元素，就算DOM已经加载了也不行，有点坑了。故操作部分我选择jquery来
 * 执行，香得不要不要的
 */
'use strict';

require('dotenv').config();

const puppeteer = require('puppeteer');
const sd = require('silly-datetime');
const nodemailer = require('nodemailer');

/**
 * 用户配置
 * @type {{telNumber: string, answers: {"11": string, "12": string, "13": string, "14": string, "15": [string, string, string], "1": string, "2": string, "3": string, "4": string, "5": string, "6": string, "7": string, "8": string, "9": string, "10": string}, username: string}[]}
 */
const users = [
    {
        username: process.env.USERNAME0,
        telNumber: process.env.TEL_NUMBER0,
        answers: {
            /**
             * 答案说明：
             * 都是单选题，属性表示题号，属性对应的值表示答案，答案为字符串ABCD中的一个则直接选择对应的项，
             * 答案为数组则从数组中随机选择一个，不支持自己填文本，懒得做
             */
            1: 'A',
            2: ['A', 'B'],
            3: 'A',
            4: ['A', 'B'],
            5: 'A',
            6: ['A', 'C'],
            7: ['A', 'B'],
            8: ['A', 'B'],
            9: 'A',
            10: ['A', 'B'],
            11: 'C',
            12: 'A',
            13: ['A', 'B'],
            14: 'A',
            15: ['A', 'B', 'C'],
        }
    },
    {
        username: process.env.USERNAME1,
        telNumber: process.env.TEL_NUMBER1,
        answers: {
            /**
             * 答案说明：
             * 都是单选题，属性表示题号，属性对应的值表示答案，答案为字符串ABCD中的一个则直接选择对应的项，
             * 答案为数组则从数组中随机选择一个，不支持自己填文本，懒得做
             */
            1: 'A',
            2: ['A', 'B'],
            3: 'A',
            4: ['A', 'B'],
            5: ['A', 'C'],
            6: ['A', 'C'],
            7: ['A', 'B'],
            8: ['A', 'B'],
            9: 'A',
            10: ['A', 'B'],
            11: ['A', 'C'],
            12: ['A', 'B'],
            13: ['A', 'B'],
            14: 'A',
            15: ['A', 'B', 'C'],
        }
    }
];

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--start-maximized'], // --start-maximized以最大化窗口启动
            slowMo: 50, // 每一次操作延迟毫秒数
            devtools: false,
            ignoreHTTPSErrors: true // 忽略HTTPS错误
        });
        const page = await browser.newPage();
        await page.emulate({
            viewport: {
                width: 1366,
                height: 768,
                deviceScaleFactor: 2 // 此参数越大，截图质量越高，文件也越大，一般设置为2已经很好了
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36'
        });
        await page.setJavaScriptEnabled(true);
        await page.setDefaultTimeout(0); // 默认超时时间，单位为毫秒

        for (let id = 0; id < users.length; id++) {
            let username = users[id].username;
            let telNumber = users[id].telNumber;
            let answers = users[id].answers;

            // 清除cookies，防止浏览器记住当前用户
            await page._client.send('Network.clearBrowserCookies');

            // 前往问卷
            await page.goto('https://www.wenjuan.com/s/2uE3A3/');

            // 输入手机号码
            await page.waitForSelector('#lmPhoneNum');
            await page.type('#lmPhoneNum', telNumber);

            // 点击下一步
            await page.waitForSelector('#lm_next_button');
            await page.click('#lm_next_button');

            // 等待问答元素加载完成
            await page.waitForSelector('#question_box');
            await page.waitForSelector('#next_button');

            // 插入jquery，方便操作DOM
            let noJquery = await page.evaluate(() => typeof window.jQuery === 'undefined');
            if (noJquery) {
                await page.addScriptTag({
                    path: 'tools/jquery-3.4.1.min.js'
                });
            }

            // 插入js自动答题
            await page.evaluate((answers) => {
                /**
                 * 生成一个介于min（含）与max（含）之间的随机整数
                 *
                 * @param min
                 * @param max
                 *
                 * @returns {number}
                 */
                let getRandomIntInclusive = function (min, max) {
                    min = Math.ceil(min);
                    max = Math.floor(max);
                    return Math.floor(Math.random() * (max - min + 1)) + min; // The maximum is inclusive and the minimum is inclusive
                };

                /**
                 * 字符答案映射为数值下标
                 * @type {{A: number, a: number, B: number, b: number, C: number, c: number, D: number, d: number}}
                 */
                const optMap = {
                    A: 0,
                    B: 1,
                    C: 2,
                    D: 3,
                    a: 0,
                    b: 1,
                    c: 2,
                    d: 3
                };

                /**
                 * 通过题目编号得到答案编号，答案编号来自optMap的映射
                 *
                 * @param qNum
                 *
                 * @returns {*}
                 */
                let q2a = function (qNum) {
                    // 取得字母答案
                    let answer = answers[qNum];

                    console.log('答案字母：' + answer);

                    if (typeof answer === 'string') {
                        return optMap[answer];
                    } else if ($.isArray(answer)) { // 数组答案代表随机选出一个
                        return optMap[answer[getRandomIntInclusive(0, answer.length - 1)]];
                    }

                    console.log('未找到题号对应的答案');

                    return false;
                };

                // 确定答案位置并点击
                $('.question').each(function () {
                    let $this = $(this);
                    let qNum = $this.find('.title .answer_title .Qnum').html().toString().replace('\.', '');
                    let aNum = q2a(qNum);
                    let opt = $this.find('.icheckbox_div:eq(' + aNum + ') .option_label');

                    console.log('定位答案位置' + opt);
                    console.log('答案编号：' + aNum);

                    // 愉快的猛击答案
                    opt.trigger('click');
                });
            }, answers);

            // 截屏记录一波
            let imgName = username + '_' + sd.format(new Date(), 'YYYY_MM_DD_HH_mm_ss') + '.png';
            await page.screenshot({
                path: imgName,
                type: 'png',
                fullPage: true
            });

            // 提交答案
            await page.evaluate(() => {
                $(document).ready(() => {
                    let nextBtn = $('#next_button');
                    $('html, body').animate({
                        scrollTop: nextBtn.offset().top
                    }, 1000);
                    nextBtn.trigger('click');
                });
            });


            /*await page.waitForSelector('#next_button');
            await page.click('#next_button');

            // 抽奖
            await page.waitForSelector('.dc-draw_btn_content');
            await page.click('.dc-draw_btn_content');*/
        }

        // 拜拜
        await browser.close();
    } catch (error) { // 出现任何错误都打印并关闭浏览器
        console.log('触发错误自动关闭浏览器');
        console.log(error);
        await browser.close();
    }
})();

/*async function sendMail(to, subject, html) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        }
    });

    await transporter.sendMail({
        from: '"Im Robot 👻" <llf.push@gmail.com>', // 发送者
        to: to, // 接收者，多个用英文逗号隔开
        subject: subject,
        text: '你的邮箱太挫了，不支持html，不想给你说了。',
        /!*attachments: [
            {
                filename: 'image.png',
                path: '/path/to/file',
                cid: 'unique@kreata.ee' //same cid value as in the html img src
            },
            {
                filename: 'image.png',
                path: __dirname + '/folder/Logo.png',
                cid: 'unique@kreata.ee' //same cid value as in the html img src
            }
        ],*!/
        html: html
    });
}

sendMail('593198779@qq.com', '测试啦', 'fuckyou').catch(console.error);*/
