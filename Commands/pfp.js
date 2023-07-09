const axios = require("axios").default
const fs = require("fs")

module.exports = {
    name:"pfp",
    run:async (data) => {
        let {ig,message,loggedInUser,mention} = data
        if(!mention) mention = loggedInUser.username
        await ig.realtime.direct.sendText({text:"Fetching pfp....",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        let user = await ig.user.searchExact(mention)
        let userInfo = await ig.user.info(user.pk)
        if(userInfo) user = userInfo
        let url = user?.hd_profile_pic_url_info?.url || user.profile_pic_url
        let {data:img_data} = await getImage(url)
        await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:img_data})
        
    }
}

async function getImage(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return {data:img.data}
}