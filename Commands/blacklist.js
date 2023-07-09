module.exports = {
    name:"blacklist",
    adminOnly:true,
    run:async (data) => {

        let {ig,message,mention,sql} = data

        user = await ig.user.searchExact(mention)
        let userInfo = await ig.user.info(user.pk)
        if(userInfo) user = userInfo
        if(!user) return await ig.realtime.direct.sendText({text:"Invalid User",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})

        let userId = user.pk
        
        let exists = await sql.query(`
            SELECT * FROM BlacklistedUsers
            WHERE id='${userId}' AND thread='${message.message.thread_id}'
        `)
        
        if(exists.rowsAffected[0] > 0) return await ig.realtime.direct.sendText({text:`This user is already blacklisted`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        
        await sql.query(`
            INSERT INTO BlacklistedUsers (thread,id)
            VALUES ('${message.message.thread_id}','${userId}');
        `)
        
        return await ig.realtime.direct.sendText({text:`Blacklisted @${mention}`,threadId:message.message.thread_id})
    }
}