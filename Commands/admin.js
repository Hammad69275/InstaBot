module.exports = {
    name:"admin",
    adminOnly:true,
    run:async (data) => {

        const {message,ig,text,config: config,ContextHandler,sql} = data
        
        let args = text.substring(1).split(" ")
        let feature = args[0]
        let action = args[1]

        if(feature == "clearContext"){

            ContextHandler.clearAll(message.message.thread_id)
            return  await ig.realtime.direct.sendText({text:"Context Cleared!",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
       
        }else if(feature == "AI_imitation"){
            
            if(action == "set"){
                
                ContextHandler.clearAll(message.message.thread_id)
                
                let arg = text.substring(1).replace("AI_imitation set","")?.match(/(['"])(?:(?!\1|\\).|\\.)*\1/g) || []
                
                let thread = message.message.thread_id
                let imitation = arg[0]?.replace(/"/g,"")
                
                if(!imitation) return await ig.realtime.direct.sendText({text:"No imitation given for the character",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                if(imitation.length >= 300) return await ig.realtime.direct.sendText({text:"Imitation must be less than 300 characters",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                
                const query = `
                    MERGE INTO Imitations AS target
                    USING (VALUES (@thread,@imitation)) AS source (thread,imitation)
                    On target.thread = source.thread
                    WHEN MATCHED THEN
                        UPDATE SET target.imitation = source.imitation
                    WHEN NOT MATCHED THEN
                        INSERT (thread,imitation)
                        VALUES (source.thread,source.imitation);
                `
                const request = new sql.Request()
                request.input('thread', sql.VarChar, thread);
                request.input('imitation', sql.VarChar, imitation);

                await request.query(query)

                return await ig.realtime.direct.sendText({text:"Successfully set imitation",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            
            }else if(action == "get") {
               
                let {recordset,rowsAffected} = await sql.query(`
                    SELECT * FROM Imitations
                    WHERE thread='${message.message.thread_id}'
                `)
                
                let imitation = config.defaultImitation

                if(rowsAffected[0] > 0){
                    imitation = recordset[0].imitation
                }

                return await ig.realtime.direct.sendText({text:`Imitation: ${imitation}`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            }else if(action == "reset") {
               
                await sql.query(`
                    DELETE FROM Imitations 
                    WHERE thread='${message.message.thread_id}'
                `)
                
                return await ig.realtime.direct.sendText({text:`Reset complete`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            
            }else {
                return await ig.realtime.direct.sendText({text:"Invalid action",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            }
          
        }
        else {
            return await ig.realtime.direct.sendText({text:"Invalid Feature",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        }
    }
}