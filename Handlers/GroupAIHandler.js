const config = require("../config.json")
module.exports = {
    run:async ({ig,openai,message,ContextHandler,loggedInUser}) => {
            
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})    
            let messages = ContextHandler.addMessage({role:"user",content:message.message.text.replace(`@${loggedInUser.username}`,``)},message.message.user_id)
            
            let resp = await openai.createChatCompletion({
                model:"gpt-3.5-turbo",
                messages:[
                    {role:"system",content:config.AIPrompt}
                    ,...messages
                ]
            })
            resp = resp.data.choices[0].message.content
            if(resp.toLowerCase().startsWith("binish:")) resp = resp.substring(7)
            ContextHandler.addMessage({role:"assistant",content:resp},message.message.user_id)
            
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})

            await ig.realtime.direct.sendText({text:resp,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            return
        }
}