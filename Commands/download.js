const axios = require("axios")
module.exports = {
    name:"download",
    replyOnly:true,
    run:async (data) => {
        if(data.message.message.replied_to_message.item_type !== "raven_media") return
        let {media} = data.message.message.replied_to_message.visual_media
       
        await data.ig.realtime.direct.indicateActivity({threadId:data.message.message.thread_id,isActive:true})
        
        if(media.media_type == 1){
            let candidates = media.image_versions2.candidates
            let image = await getMedia(candidates[0].url)
            await data.ig.entity.directThread(data.message.message.thread_id).broadcastPhoto({file:image})
        }else if(media.media_type == 2){
            let video = await getMedia(media.video_versions[0].url)
            await data.ig.realtime.direct.indicateActivity({threadId:data.message.message.thread_id,isActive:true})
            await data.ig.entity.directThread(data.message.message.thread_id).broadcastVideo({video})
        }
        await data.ig.realtime.direct.indicateActivity({threadId:data.message.message.thread_id,isActive:false})
        return
    }
}
async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}