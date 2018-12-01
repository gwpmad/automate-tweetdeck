// CLI arguments: CSV file (columns - Tweet, tweet time, tweet date), username, password
// you can make dates with e.g. 5 days between them by doing =D4+5 with D4 being a date (use format tab in Sheets)
// Until CSV sorted out, date CLI argument example: 18:30-23/5/2019

const puppeteer = require('puppeteer');
const moment = require('moment');

const { username, password, date } = require('minimist')(process.argv.slice(2));
const momentDate = moment(date, 'HH:mm-DD/MM/YYYY');
const monthYear = momentDate.format('MMMM YYYY');
const dateOfMonth = momentDate.date();
const [hour, minute] = momentDate.format('HH:mm').split(':');

const focusAndType = async (elementHandle, message) => {
  await elementHandle.focus();
  return elementHandle.type(message);
};

const clearAndType = async(elementHandle, message) => {
  await elementHandle.click({ clickCount: 2 })
  return elementHandle.type(message);
};

const loginPageUrl = 'https://twitter.com/login?hide_message=true&redirect_after_login=https%3A%2F%2Ftweetdeck.twitter.com%2F%3Fvia_twitter_login%3Dtrue';
puppeteer.launch({ headless: false }).then(async (browser) => {
  try {
    const page = await browser.newPage();
    await page.goto(loginPageUrl);
    const usernameField = await page.$('.js-username-field');
    const passwordField = await page.$('.js-password-field');
    await focusAndType(usernameField, username);
    await focusAndType(passwordField, password);
    await Promise.all([
      passwordField.press('Enter'),
      page.waitForSelector('.js-show-drawer.tweet-button'),
    ]);
    const tweetButton = await page.$('.js-show-drawer.tweet-button');
    await Promise.all([
      tweetButton.click(),
      page.waitForSelector('.js-app-content.is-open'),
    ]);
    await page.waitFor(500)

    const message = "It's December!";
    const tweetTextArea = await page.$('textarea.js-compose-text');
    await focusAndType(tweetTextArea, message);

    const scheduleButton = await page.$('.js-schedule-button-label');
    await scheduleButton.click();

    const selectCorrectMonth = async () => {
      const calTitle = await page.$('#caltitle');
      const currentMonthYear = await page.evaluate(el => el.innerText, calTitle);
      if (currentMonthYear !== monthYear) {
        const nextMonthButton = await page.$('#next-month');
        await nextMonthButton.click();
        await page.waitFor((oldMonthYear) => document.querySelector('#caltitle').innerText !== oldMonthYear, {}, currentMonthYear);
        return selectCorrectMonth();
      }
    }
    await selectCorrectMonth();
    const calWeeks = await page.$('#calweeks');
    const dateButton = await calWeeks.$(`a[href="#${dateOfMonth}"]`);
    await dateButton.click();

    const hourField = await page.$('#scheduled-hour')
    const minuteField = await page.$('#scheduled-minute')
    await clearAndType(hourField, hour);
    await clearAndType(minuteField, minute);

    const sendTweetButton = await page.$('button.js-send-button');
    await sendTweetButton.click();

  } catch(e) {
    console.log('Error:', e)
  }
});
