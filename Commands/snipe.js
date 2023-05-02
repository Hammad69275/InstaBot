const axios = require("axios").default

module.exports = {
    name:"snipe",
    run:async (data) => {
        let {meID,ig,message,mention,messages_container,loggedInUser} = data
        let userId = message.message.user_id
        if(mention){
            userId = await ig.user.getIdByUsername(mention)
        }
        else mention = (await ig.user.info(userId)).username
        if(meID == userId) return
        
        let msg = messages_container.getUnsentMessage({threadId:message.message.thread_id,userId})
        if(!msg) return ig.realtime.direct.sendText({text:"There is no message record for this user!",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        if(msg.item_type == "media" && msg.imageURL !== null){
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})

            let imgdata = await getMedia(msg.imageURL)
            await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:imgdata})
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})
            return await ig.realtime.direct.sendText({text:`Unsent By:- @${mention}`,threadId:message.message.thread_id})

        }else if(msg.item_type == "media" && msg.videoURL !== null){
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})
            
            let video = await getMedia(msg.videoURL)
            await ig.entity.directThread(message.message.thread_id).broadcastVideo({video})
            
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})
            return await ig.realtime.direct.sendText({text:`Unsent By:- @${mention}`,threadId:message.message.thread_id})

        }else if(msg.item_type == "voice_media" && msg.audioURL !== null){
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})
            
            let audio = await getMedia(msg.audioURL)
            await ig.entity.directThread(message.message.thread_id).broadcastVoice({file:audio})
            
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})
            return await ig.realtime.direct.sendText({text:`Unsent By:- @${mention}`,threadId:message.message.thread_id})
        }else if(["link","text"].includes(msg.item_type)){
            return await ig.realtime.direct.sendText({text:`Unsent By:- @${mention} \n\n"${truncateString(msg.text)}"`,threadId:message.message.thread_id})
        }
    }
}

function truncateString(str){
    if(str.length > 800){
        return str.substring(0,800) + "..."
    }else {
        return str
    }
}
async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}