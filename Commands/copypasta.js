const axios = require(`axios`).default
module.exports = {
    name:"copypasta",
    run:async({ig,message}) => {
        let cp = await axios.get(`https://www.reddit.com/r/copypasta/random/.json`)
        let text = cp.data[0].data.children[0].data.selftext
        await ig.realtime.direct.sendText({text,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
    }
}