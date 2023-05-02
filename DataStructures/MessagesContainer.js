module.exports = class MessagesContainer{
    constructor(maxMessages){
        this.messages = {}
        this.maxMessages = maxMessages
    }
    add(message){
        let {thread_id, item_id, user_id,timestamp,item_type} = message
        let msg = {
            thread_id,
            item_id,
            user_id,
            timestamp,
            item_type,
            text:["text","link"].includes(item_type) ? message.text : null,
            imageURL:item_type == "media" && message.media.media_type == 1 ? message.media.image_versions2.candidates[0].url : null,
            videoURL:item_type == "media" && message.media.media_type == 2 ? message.media.video_versions[0].url : null,
            audioURL:item_type == "voice_media" ? message.voice_media.media.audio.audio_src : null,
            unsent:false,
        }
        if(!this.messages[thread_id]) this.messages[thread_id] = []
        if(this.messages[thread_id].length >= this.maxMessages ) this.messages[thread_id].shift()
        this.messages[thread_id].push(msg)
    }
    setUnsend({threadId,itemId}){
        let msg_index = this.messages[threadId]?.findIndex(m => m.item_id == itemId)
        if(msg_index == undefined) return
        if(msg_index < 0) return
        this.messages[threadId][msg_index].unsent = true
        return        
    }
    getUnsentMessage({threadId,userId}){
        let thread = this.messages[threadId]
        if(!thread) return null
        let msgs = thread.filter(m => m.unsent && m.user_id == userId)
        if(msgs.length > 0){
            let msg = msgs.sort((a,b) => b.timestamp - a.timestamp)[0]
            return msg
        }else return null
    }
}