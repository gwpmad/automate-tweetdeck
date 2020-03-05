## This project is now likely out of date and buggy - if only Tweetdeck had a simpler UI!

### Automate-Tweetdeck
Uses a headless browser (Chromium) to schedule all your tweets! Just put them in a CSV with date and time and the rest is easy.

_tweets.csv_
```
Tweet,Date,Time
This is a test,02/12/2018,18:31
Another test,07/12/2018,18:30
Yet another test,12/12/2018,18:29
Test Test Test,17/12/2018,18:31
```

Run the script, passing in your Twitter username and password and the CSV filename:
```
node index.js --username myUsername, --password myPassword --filename ./tweets.csv
```

This was written quickly so please check in Tweetdeck afterwards that your tweets were scheduled for the right dates/times ;)
