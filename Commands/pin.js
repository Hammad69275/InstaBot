module.exports = {
    name:"pin",
    replyOnly:true,
    run:async ({message,sql,text,ig}) => {
        
        let keyword = text.substring(1)

        let id = message.message.replied_to_message.item_id

        let exists = await sql.query(`
            SELECT * FROM pins
            WHERE item='${id}'
        `)
        
        if(exists.rowsAffected[0] > 0) return await ig.realtime.direct.sendText({text:`This pin already exists` + `${exists.recordset[0].keyword == `undefined` ? `` : ` with the keyword ${exists.recordset[0].keyword}`}`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        
        let request = new sql.Request()
        request.input(`keyword`,sql.VarChar,keyword.length > 0 ? keyword:undefined)
        
        await request.query(`
            INSERT INTO pins (thread,item,clientContext,keyword)
            VALUES ('${message.message.thread_id}','${id}','${message.message.replied_to_message.client_context}',@keyword);
        `)
        return await ig.realtime.direct.sendText({text:`Message pinned successfully`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
    }
}