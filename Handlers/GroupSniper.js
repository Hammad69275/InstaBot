module.exports = {
    run:async (data) => {
        let {path,thread_id,user_id} = data.message.message
        if(user_id == "39174819711") return
        let itemId = path.split("/").pop()
        data.messageQueue.push({threadID:thread_id,item_id:itemId,type:"message_unsend"})

    }
}