module.exports = {
    name:"pinned",
    run:async ({message,sql,text,ig}) => {
        
        let keyword = text.substring(1)

        let query;

        if(keyword.length > 0){
            let request = new sql.Request()
            request.input(`keyword`,sql.VarChar,keyword)
            query = await request.query(`
                SELECT * FROM pins
                WHERE thread='${message.message.thread_id}' AND keyword=@keyword
            `)
        }else query = await sql.query(`
                SELECT * FROM pins
                WHERE thread='${message.message.thread_id}'
        `)
        
        
        let {recordset,rowsAffected} = query

        if(rowsAffected[0] == 0) return await ig.realtime.direct.sendText({text:`No pinned messages found`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        for (let i = 0; i<recordset.length;i++){
            await ig.realtime.direct.sendText({text:recordset[i].keyword == `undefined` ? `.`:recordset[i].keyword,threadId:message.message.thread_id,reply:{item_id:recordset[i].item,client_context:recordset[i].clientContext}})
        }
    }
}