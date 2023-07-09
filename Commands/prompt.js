const axios = require("axios").default
module.exports = {
    name:"prompt",
    run:async (data) => {
        let {ig,message,text,playground} = data
        let image = message.message?.replied_to_message?.media.image_versions2?.candidates[0].url
        await ig.realtime.direct.sendText({text:"Generating...",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})

        let payload = {
            prompt:text,
        }
        if(image){
            let base64img = await getImage(image,2)
            payload.img = base64img.data
        } 
            
        let generatedImage = await playground.generateImage(payload)
        if(!generatedImage?.images[0]?.url) 
        {
            console.log(generatedImage)
            return await ig.realtime.direct.sendText({text:"failed",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        }
        let img = await getImage( generatedImage?.images[0]?.url,1)
        await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:img.data})
    }
}

async function getImage(url,type){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    if(type == 1) return {data:img.data}
    let b64 = `data:image/${img.headers["content-type"].split("/")[1]};base64,` + Buffer.from(img.data,"binary").toString("base64")
    return {data:b64}
}