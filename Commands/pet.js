const petPetGif = require('pet-pet-gif')
const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")

module.exports = {
    name:"pet",
    run:async (data) => {
        let {ig,message,loggedInUser,mention} = data
        if(!mention) mention = loggedInUser.username
        await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})    
        let user = await ig.user.searchExact(mention)
        let userInfo = await ig.user.info(user.pk)
        if(userInfo) user = userInfo
        let url = user?.hd_profile_pic_url_info?.url || user.profile_pic_url
        await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})    
        let img_data = await petPetGif(url)
        let video = await makeMP4(img_data,user.profile_pic_id)
        await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})    
        await ig.entity.directThread(message.message.thread_id).broadcastVideo({video})
        
    }
}

async function makeMP4(buffer,name){
    return new Promise((resolve,reject) => {    
        let gif = fs.writeFileSync(`./media/${name}.gif`,buffer)
        let save = ffmpeg(`./media/${name}.gif`).outputOptions([
            '-movflags faststart',
            '-pix_fmt yuv420p',
            '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
        ]).inputFormat("gif")

        save.on("end",() => {
            let mp4 = fs.readFileSync(`./media/${name}.mp4`)
            fs.unlinkSync(`./media/${name}.mp4`)
            fs.unlinkSync(`./media/${name}.gif`)
            resolve(mp4)
        })

        save.save(`./media/${name}.mp4`)
    })
};