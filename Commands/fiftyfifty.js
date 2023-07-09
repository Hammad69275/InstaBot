const axios = require(`axios`).default
const Jimp = require('jimp');

module.exports = {
    name:"fiftyfifty",
    run:async ({ig,message,text}) => {
        let participants = text.match(/@([A-Za-z0-9_\.]+)/g)
        
        ig.realtime.direct.sendText({text:"Fetching participants data",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        
        await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})
        if(participants){
            participants = participants.map((i) => {
                let username = i.replace(`@`,``)
                let user = ig.user.searchExact(username)
                return user
            })
            participants = await Promise.all(participants)
        }else participants = []

        //participants = results.map((result) => ({ ...result }));
        let sender = await ig.user.info(message.message.user_id)
        participants.push(sender)

        await ig.realtime.direct.sendText({text:"The game is starting....",threadId:message.message.thread_id})

        await GameLoop(participants,ig,message)

    }
}

async function GameLoop(participants,ig,message){
    
    let fetchedPost = await axios.get(`https://www.reddit.com/r/fiftyfifty/random/.json`)
    let title = fetchedPost.data[0].data.children[0].data.title.replace(`[50/50] `,``)
    let fetchedImage = await getMedia(fetchedPost.data[0].data.children[0].data.url)
    
    let o1 = `1️⃣: ` + title.split("|")[0]
    let o2 = `2️⃣: ` + title.split("|")[1]
    const image = await blurImage(fetchedImage,70)

    let sentImage = await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:image})
    await ig.realtime.direct.sendText({text:`${o1}\n${o2}\n\nReact to the image with the respective emoji to select your choice. Once all participants have reacted, the original image will be revealed`,threadId:message.message.thread_id})
    let reactions = await awaitReactions(ig,sentImage.item_id,participants)

    await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:fetchedImage})
    await ig.realtime.direct.sendText({text:`Results\n1️⃣: ${reactions.filter(r => r.choice == 1).map(r => `@` + r.username).join(` `)}\n2️⃣: ${reactions.filter(r => r.choice == 2).map(r => `@` + r.username).join(` `)}`,threadId:message.message.thread_id})
    
}

async function awaitReactions(ig,itemId,participants){
    return new Promise((resolve,reject) => {
        let reactions = []
        let handler = message => {
            if(!message.message?.emoji) return
            let user_id = message.message.path.split("/")[8]
            let item_id = message.message.path.split("/")[5]
            if(item_id !== itemId) return
            let choice
            if(message.message.emoji == `1️⃣`) choice = 1
            else if(message.message.emoji == `2️⃣`) choice = 2
            else return
            if(participants.find(i => i.pk == user_id) && !reactions.find(r => r.user_id == user_id)) reactions.push({user_id,username:participants.find(i => i.pk == user_id).username,choice})
            if(participants.length == reactions.length){
                ig.realtime.off("message",handler)
                resolve(reactions)
            }
            return
        }
        ig.realtime.on("message",handler)
        setTimeout(() => {
            ig.realtime.off("message",handler)
            resolve(reactions)
        }, 120000);
    })
}

function blurImage(imageBuffer, blurRadius) {
    return new Promise((resolve,reject) => {
        Jimp.read(imageBuffer)
      .then(image => {
        // Apply blur effect
        image.blur(blurRadius);
  
        // Convert the image to a buffer
        resolve(image.getBufferAsync(Jimp.MIME_JPEG));
      })
      .catch(error => {
        reject(error)
      });
    })
}
async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}