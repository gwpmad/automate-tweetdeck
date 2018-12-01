// CSV headers required: Tweet, Date (dates in format DD/MM/YYYY), Time (24 hour clock, in format HH:MM)

const puppeteer = require('puppeteer');
const moment = require('moment');
const csv = require('fast-csv');
const fs = require('fs');

const { username, password, filename } = require('minimist')(process.argv.slice(2));

const focusAndType = async (elementHandle, message) => {
  await elementHandle.focus();
  await elementHandle.type(message);
};

const clearAndType = async (elementHandle, message) => {
  await elementHandle.click({ clickCount: 2 })
  return elementHandle.type(message);
};

const logIn = async (page) => {
  await page.goto(loginPageUrl);
  const usernameField = await page.$('.js-username-field');
  const passwordField = await page.$('.js-password-field');
  await focusAndType(usernameField, username);
  await focusAndType(passwordField, password);
  await Promise.all([
    passwordField.press('Enter'),
    page.waitForSelector('.js-show-drawer.tweet-button'),
  ]);
};

const selectCorrectMonth = async (page, monthYear) => {
  const calTitle = await page.$('#caltitle');
  const currentMonthYear = await page.evaluate(el => el.innerText, calTitle);
  if (currentMonthYear !== monthYear) {
    const nextMonthButton = await page.$('#next-month');
    await nextMonthButton.click();
    await page.waitFor((oldMonthYear) => document.querySelector('#caltitle').innerText !== oldMonthYear, {}, currentMonthYear);
    return selectCorrectMonth(page, monthYear);
  }
};

const addDate = async (page, date) => {
  const momentDate = moment(date, 'DD/MM/YYYY');
  const monthYear = momentDate.format('MMMM YYYY');
  const dateOfMonth = momentDate.date();
  const scheduleButton = await page.$('.js-schedule-button-label');
  await scheduleButton.click();
  await selectCorrectMonth(page, monthYear);
  const calWeeks = await page.$('#calweeks');
  const dateButton = await calWeeks.$(`a[href="#${dateOfMonth}"]`);
  await dateButton.click();
}

const addTime = async (page, time) => {
  const momentTime = moment(time, 'HH:mm');
  const [ hour, minute ] = momentTime.format('HH:mm').split(':')
  const amPm = momentTime.format('A');
  const hourField = await page.$('#scheduled-hour')
  const minuteField = await page.$('#scheduled-minute')
  await clearAndType(hourField, hour);
  await clearAndType(minuteField, minute);
  const amPmButton = await page.$('#amPm');
  const currentAmPM = await page.evaluate(el => el.innerText, amPmButton);
  if (currentAmPM !== amPm) {
    await amPmButton.click();
  }
};

const scheduleTweet = async (page, { Tweet: tweet, Date: date, Time: time}) => {
  const tweetButton = await page.$('.js-show-drawer.tweet-button');
  await Promise.all([
    tweetButton.click(),
    page.waitForSelector('.js-app-content.is-open'),
  ]);
  await page.waitFor(500)
  const tweetTextArea = await page.$('textarea.js-compose-text');
  await focusAndType(tweetTextArea, tweet);
  await addDate(page, date);
  await addTime(page, time);

  const sendTweetButton = await page.$('button.js-send-button');
  await sendTweetButton.click();
};

const parseCsv = () => new Promise((resolve, reject) => {
  const stream = fs.createReadStream(`${__dirname}/${filename}`);
  const parsedCsvArray = [];
  const csvStream = csv({ headers: true })
    .on('data', (data) => parsedCsvArray.push(data))
    .on('end', () => resolve(parsedCsvArray))
    .on('error', (err) => reject(err));
  stream.pipe(csvStream);
});

const loginPageUrl = 'https://twitter.com/login?hide_message=true&redirect_after_login=https%3A%2F%2Ftweetdeck.twitter.com%2F%3Fvia_twitter_login%3Dtrue';
puppeteer.launch({ headless: false }).then(async (browser) => {
  try {
    const tweets = await parseCsv();
    const page = await browser.newPage();
    await logIn(page);

    for (const tweet of tweets) {
      await scheduleTweet(page, tweet);
      await page.waitForSelector('.js-app-content:not(.is-open)');
    }
    console.log('finished')
    process.exit(0);
  } catch(e) {
    console.log('Error:', e)
  }
});
