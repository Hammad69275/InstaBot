<h1 align="center">InstaBot</h1>
<h3 align="center">An Instagram bot written in NodeJS based on my fork of <a href="https://github.com/Hammad69275/instagram-private-api">instagram-private-api</a> and <a href="https://github.com/Hammad69275/instagram_mqtt">instagram_mqtt</a></h3>
InstaBot is a powerful Instagram bot that offers several advanced features to make your Instagram experience better. With InstaBot, you can download reels, posts, stories, and raven media, see unsent messages with a single command, and chat with an AI-powered ChatBot.
<h2>Features</h2>
<ul>
  <li><b>AI ChatBot:</b> InstaBot uses GPT-3 Turbo to provide users with an advanced chatbot experience. ChatBot functionality is limited to threads only.</li>
  <li><b>Media Downloader:</b> InstaBot can download reels, posts, and stories with a simple command. Share the reels, and InstaBot will download and send them back to you!</li>
  <li><b>Message Sniper:</b> InstaBot keeps track of unsent messages and can send them back with a single command. Currently, it only tracks text messages, photos, and videos, and media files will expire after a day.</li>
  <li><b>Raven Media Downloader:</b> InstaBot can download raven media with a single command. Just reply to the photo or video with "!download," and InstaBot will download it for you!</li>
  <li><b>Music Finder:</b> InstaBot can now help you recognize music used in any reel or post. Just share the post with the message "find song" and it will find it for you</li>
  <li><b>AI Image Generator:</b> Using the reverse engineered Playground AIs API, Instabot can now generate AI images for you!</li>
  <li><b>AI Link Finder:</b> You can get the link of any movie or anime by just asking the bot for it. The AI is integrated with Fmovies.to And 9anime.to API to do the job for you!</li>
  <li><b>Local Data Store:</b> InstaBot can now store all the instagram activity locally including changes made in groups eg title change, icon change, kick, leave etc. It can also store all the messages sent in a groupchat locally including media messages. This feature is totally optional and can be disabled from the config</li>
  <li><b>Meme Generator:</b>
  Currently, this feature allows you to overlay text on top of images for a fun and creative experience. Our collection of images is conveniently stored in a folder called "media," where each folder name corresponds to a unique command to access and use the images.

  To create your own meme command, simply create a folder with your desired name in the media folder and paste your images there. For example, if you want to add an !einstein command, Create a folder named einstein inside the media folder and paste the images of your choice there. Restart the bot and you will be able to use the command!
  </li>
  
</ul>
<h2>Commands</h2>

`!snipe @user`: Sends the last message unsent by the mentioned user

`!pfp @user`: Downloads and sends the profile picture of mentioned user

`!download`: When replied to a raven media, it downloads it and sends it to you

`!prompt prompt`: Generates any image with the given prompt. Reply to an existing image to use it as a reference image.

`!pin keyword`: When replied to a message, it pins it so it can later be accessed with !pinned command.

`!pinned keyword`: Replies to the message associated with the given keyword. Leave the keyword field empty to get all the pins in a group chat

`!pet @user`: Generates a pet gif of the mentioned user.

`!youtube "channel name" "video title"`: When replied to a message, it generates an image that looks like the screenshot of a youtube video with the given channel name, replied picture as the thumbnail and video title.

`!fiftyfifty @participant1 @participant2...n (NSFW)`: Starts a game of fifty fifty with the mentioned users. Mention none to play alone.

`!confessions`: Fetches a random post from r/confessions.

`!copypasta`: Fetches a random post from r/copypasta.

`!fiftyfifty @participant1 @participant2...n (NSFW)`: Starts a game of fifty fifty with the mentioned users. Mention none to play alone.

`!leaderboard`: Ranks all the users in group chat by message count. Only works if storeMessages option is enabled.

`![image collection name] text`: Selects a random image from the specified collection and overlays the given text on top of it. By default, there are two image collections of Batman and Patrick Bateman (American Psycho). You can use them with the command !batman and !bateman.

<h3>Admin Commands</h3>

`!blacklist @user`: Blocks a user from using the bot.

`!whitelist`: Removes a user from the blacklist

`!admin AI_imitation set "imitation"`: Imitations are characters for the AI Bot. Give it whatever imitation you want and the bot will behave like it.

`!admin AI_imitation get`: Shows the currently set imitation.

`!admin AI_imitation reset`: Resets the imitation to default.

All these admin commands are group specific.

<h2>Usage</h2>
To use InstaBot, follow the steps below:
<ol>
  <li>Clone the repository and install the required dependencies.</li>
  
```
git clone https://github.com/Hammad69275/InstaBot.git
cd InstaBot
npm install
```

<li>Configure it.</li>

<li>Run the bot using the following command:</li>

```
npm start
```

<h2>Config</h2>

`Username`: Username/email of your Instagram account.

`Password`: Password for your Instagram account.

`MSSQL_Connection_String`: Microsoft SQL Database connection string. Your DB must have three tables:
```
pins (thread VarChar(MAX),item VarChar(MAX),clientContext VarChar(MAX),keyword VarChar(MAX))
BlacklistedUsers (thread VarChar(MAX),id VarChar(MAX))
Imitations (thread VarChar(MAX),imitation VarChar(MAX))
```

`OpenAI_API_Key`:Your OpenAI API Key. Must be a billing verified account.

`PlaygroundAICookies`: Login to your playground AI account and copy your cookies, format them as a javascript object (you can theoretically use chatgpt for that) and paste them here.

`Shazam_API_Key`: Subscribe to https://rapidapi.com/apidojo/api/shazam to get the API Key. Free one has a limit of 500 requests per month.

`defaultImitation`: Default imitation for the AI Bot.

`StoreMessages`: Whether to store the messages locally or not. Set it as either true or false.

`DeviceSeed`:A random piece of text used for generating device info while logging in. You can set it to anything you want.

`MaxMessagesInContext`: Max messages to send to the OpenAI API per request. The lesser the amount, the lower the cost. The higher the amount, the better the result quality, but also more expensive. By default, a value of 4 means that only 4 messages per user are stored in the context, and the bot will only have knowledge of those 4 messages.

`MaxMessagesInCache`: Max messages stored in cache. Used for the sniping feature.

<h2>Final Words</h2>
Thats all for now. I had alot of fun working on this one and I will make sure to keep it updated. Let me know about your thoughts and suggestions.


