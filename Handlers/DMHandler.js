const axios = require("axios").default

module.exports = {
    run: async (data) => {
        let {ig,message} = data
        const sendVideo = async (clip) => {
            let video = clip.video_versions[0]
            await ig.realtime.direct.sendText({text:"Downloading...",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            let vid = await getMedia(video.url)
            return await ig.entity.directThread(message.message.thread_id).broadcastVideo({video:vid})
        }
        const sendImage = async (image) => {
            let img = await getMedia(image.image_versions2.candidates[0].url)
            return await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:img})
        }

        if(message.message.item_type == "clip"){
            let clip = message.message.clip.clip
            return await sendVideo(clip)
        }else{
            if(message.message.item_type == "media_share"){
                if(message.message.media_share.media_type == 1){
                   let image = message.message.media_share
                   return await sendImage(image)
                }else if(message.message.media_share.media_type == 8){
                    let items = message.message.media_share.carousel_media
                    let selectedItem = items.find(i => i.id == message.message.media_share.carousel_share_child_media_id)
                    if(selectedItem.media_type == 1){
                        return await sendImage(selectedItem)
                    }else if(selectedItem.media_type == 2){
                        return await sendVideo(selectedItem)
                    }
                }
            }else if(message.message.item_type == "story_share"){
                if(message.message.story_share?.title) return await ig.realtime.direct.sendText({text:"The story you sent is unavailable to me because I am not following the user",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                else if(message.message.story_share.media.media_type == 1){
                    let image = message.message.story_share.media
                    return await sendImage(image)
                 }else if(message.message.story_share.media.media_type == 2){
                     let video = message.message.story_share.media
                     return await sendVideo(video)
                 }
            }

        }
    }
}


async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}
