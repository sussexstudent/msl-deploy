const puppeteer = require('puppeteer');
const lodash = require('lodash');
const chalk = require('chalk');

interface Payload {
  [skinName: string]: {
    [templateName: string]: {
      head: string;
      template: string;
    }
  }
}

interface Auth {
  username: string;
  password: string;
}

module.exports = async (auth: Auth, payload: Payload) => {
  const browser = await puppeteer.launch({headless: true });
  const page = await browser.newPage();
  console.log(`${chalk.green('✔')} started msl-deploy`)
  await page.goto('https://sussexstudent.com/login');

  const button = await page.$('.button3')
  await button.click();

  const usernameInput = await page.$('#ctl00_ctl15_UserName')
  await usernameInput.type(auth.username);
  const passwordInput = await page.$('#ctl00_ctl15_Password')
  await passwordInput.type(auth.password);
  await Promise.all([
      passwordInput.press('Enter'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);
  console.log(`${chalk.green('✔')} logged in`)
  await page.goto('https://www.sussexstudent.com/admin/portal/sitedesign/');

  // skins
  const skins = await page.$$eval('#ctl00_ctl00_Main_AdminPageContent_gvSkins > tbody > tr > td:nth-child(1) > a', (anchors: HTMLAnchorElement[]) => anchors.map(a => ([a.innerText, a.href ])));
  const skinsMap = lodash.fromPairs(skins);

  for (const skinName of Object.keys(payload)) {
    if (!skinsMap.hasOwnProperty(skinName)) {
      console.log(`${chalk.red('✘')} ${chalk.bold(skinName)} ${chalk.red('failed')} ${chalk.grey('(missing)')}`)
      break;
    }

    console.log(`${chalk.blue('-')} ${chalk.bold(skinName)}`)
    await page.goto(skinsMap[skinName]);

    const templates = await page.$$eval('#ctl00_ctl00_Main_AdminPageContent_gvTemplates > tbody > tr.msl_row > td:nth-child(1) > a', (anchors: HTMLAnchorElement[]) => anchors.map(a => ([a.innerText, a.href])));
    const templatesMap = lodash.fromPairs(templates);

    for (const templateName in payload[skinName]) {
      if (!templatesMap.hasOwnProperty(templateName)) {
        console.log(`${chalk.red('  ✘')} ${chalk.bold(templateName)} ${chalk.red('failed')} ${chalk.grey('(missing)')}`)
        break;
      }
      await page.goto(templatesMap[templateName]);

      await page.evaluate((head: string, template: string) => {
        // @ts-ignore
        document.querySelector('#ctl00_ctl00_Main_AdminPageContent_ceHead_hdnEditorContent').value = head;
        // @ts-ignore
        document.querySelector('#ctl00_ctl00_Main_AdminPageContent_cePublic_hdnEditorContent').value = template;
      }, payload[skinName][templateName].head, payload[skinName][templateName].template)

      const submitButton = await page.$('#ctl00_ctl00_Main_AdminPageContent_fsUpdate_btnSubmit');

      await Promise.all([
          submitButton.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);

      const response = await page.$eval('.msl_notification', (i: HTMLDivElement) => i.innerText);

      if (response === 'Changes saved.') {
        console.log(`${chalk.green('  ✔')} ${chalk.bold(templateName)} ${chalk.green('success')}`)
      } else {
        console.log(`${chalk.red('  ✘')} ${chalk.bold(templateName)} ${chalk.red('failed')} ${chalk.grey('(' + response + ')')}`)
      }
    }
  }

  await browser.close();
};
