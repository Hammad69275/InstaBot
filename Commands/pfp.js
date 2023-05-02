const axios = require("axios").default

module.exports = {
    name:"pfp",
    run:async (data) => {
        let {ig,message,loggedInUser,mention} = data
        if(!mention) mention = loggedInUser.username
        let user = await ig.user.getIdByUsername(mention)
        let details = await ig.user.info(user)
        let {data:img_data,format} = await getImage(details.hd_profile_pic_url_info.url)
        return await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:img_data})
    }
}

async function getImage(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return {data:img.data,format:img.headers["content-type"].split("/")[1]}
}