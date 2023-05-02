<h1 align="center">InstaBot</h1>
<h3 align="center">An Instagram bot written in NodeJS based on my fork of <a href="https://github.com/Hammad69275/instagram-private-api">instagram-private-api</a> and <a href="https://github.com/Hammad69275/instagram_mqtt">instagram_mqtt</a></h3>
InstaBot is a powerful Instagram bot that offers several advanced features to make your Instagram experience better. With InstaBot, you can download reels, posts, stories, and raven media, see unsent messages with a single command, and chat with an AI-powered ChatBot.
<h2>Features</h2>
<ul>
  <li><b>AI ChatBot:</b> InstaBot uses GPT-3 Turbo to provide users with an advanced chatbot experience. ChatBot functionality is limited to threads only.</li>
  <li><b>Media Downloader:</b> InstaBot can download reels, posts, and stories with a simple command. Share the reels, and InstaBot will download and send them back to you!</li>
  <li><b>Message Sniper:</b> InstaBot keeps track of unsent messages and can send them back with a single command. Currently, it only tracks text messages, photos, and videos, and media files will expire after a day.</li>
  <li><b>Raven Media Downloader:</b> InstaBot can download raven media with a single command. Just reply to the photo or video with "!download," and InstaBot will download it for you!</li>
</ul>
<h2>Commands</h2>

`!snipe @user`: Sends the last message unsent by the mentioned user

`!pfp @user`: Downloads and sends the profile picture of mentioned user

`!download`: When replied to a raven media, it downloads it and sends it to you

<h2>Usage</h2>
To use InstaBot, follow the steps below:
<ol>
  <li>Clone the repository and install the required dependencies.</li>
  
```
git clone https://github.com/<username>/insta-bot.git
cd insta-bot
npm install
```
<li>set the following environment variables:</li>

```
USER_NAME=<your instagram username>
PASSWORD=<your instagram password>
OPEN_AI_KEY=<your api key>
```

<li>Configure it to your needs</li>

 <li>Run the bot using the following command:</li>

```
npm start
```

<h2>Config</h2>

`MaxMessagesInCache`: The maximum amount of messages to cache

`MaxMessagesInContext`: The maximum amount of messages to send to GPT 3. The less the amount, the fewer tokens used.

`AIPrompt`: System prompt message to send with other messages to GPT 3

<h2>Note</h2>
This project could have been a lot better if I had more time but unfortunately I only had 3 days on my hands so thats all I could Make. But I will definitely update it in the future once my exams are over
