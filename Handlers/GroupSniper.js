module.exports = {
    run:async (data) => {
        let {path,thread_id} = data.message.message
        let itemId = path.split("/").pop()
        data.messages_container.setUnsend({threadId:thread_id,itemId})
    }
}