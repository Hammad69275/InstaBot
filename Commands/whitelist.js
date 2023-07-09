module.exports = {
    name:"whitelist",
    adminOnly:true,
    run:async (data) => {

        let {ig,message,mention,sql} = data

        user = await ig.user.searchExact(mention)
        let userInfo = await ig.user.info(user.pk)
        if(userInfo) user = userInfo
        if(!user) return await ig.realtime.direct.sendText({text:"Invalid User",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})

        let userId = user.pk
        
        await sql.query(`
            DELETE FROM BlacklistedUsers
            WHERE id='${userId}',thread='${message.message.thread_id}'
        `)
        
        return await ig.realtime.direct.sendText({text:`Whitelisted @${mention}`,threadId:message.message.thread_id})
    }
}