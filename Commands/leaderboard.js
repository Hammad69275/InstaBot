const fs = require(`fs`)
const JSONStream = require(`JSONStream`)
const config = require(`../config.json`)

module.exports = {
    name:"leaderboard",
    disabled:!config.StoreMessages,
    run:async(data) => {
        let {message,userStore,ig} = data
        
        let threadID = message.message.thread_id
        let users = await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(`./chat_data/${threadID}.json`, { encoding: 'utf8' });
            const parser = JSONStream.parse('*');
            let users = []
            parser.on(`data`,async (obj) => {
                let object = users.find(u => u.id == obj.user_id)
                let user = userStore[obj.user_id]
                if(!user){
                    user = {
                        "user_id": obj.user_id,
                        "pk": obj.user_id,
                        "username": `User Not Found`,
                        "fullName": `User Not Found`,
                        "oldUsernames": []
                    }
                }
                if(!object) return users.push({
                    username:user.username,
                    count:1,
                    id:obj.user_id
                })
                users.find(u => u.id == obj.user_id).count++
            })
            readStream.pipe(parser);
            readStream.on(`end`,() => {
                resolve(users)
            })
        })
        await ig.realtime.direct.sendText({threadId:message.message.thread_id,text:`Ranked By Message Count(since 2 May)\n\n${users.sort((a,b) => b.count-a.count).map((u,index) => `${index+1}) ${u.username}: ${u.count} `).join(`\n`)}`})
    }
}