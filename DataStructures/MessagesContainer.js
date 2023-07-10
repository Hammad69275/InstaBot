const fs = require("fs")
const JSONStream = require('JSONStream');

module.exports = class MessagesContainer{
    constructor(maxMessages,useCache){
        this.messages = {}
        this.maxMessages = maxMessages
        this.useCache = useCache
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
            imageURL:null,
            videoURL:null,
            audioURL:item_type == "voice_media" ? message.voice_media.media.audio.audio_src : null,
            postURL: ["media_share","clip"].includes(item_type) ? `https://www.instagram.com/p/${message.media_share?.code || message.clip?.clip?.code}` : null , 
            unsent:false,
        }
        if(message?.replied_to_message){
            msg.replied_to_message = {
                item_id:message?.replied_to_message?.item_id,
                user_id:message?.replied_to_message?.user_id
            }
        }
        if(item_type == "media" || item_type == "raven_media"){
            let mediaType = item_type == `media` ? message.media.media_type : message.visual_media.media.media_type
            let media =  item_type == `media` ? message.media : message.visual_media.media
            if(mediaType == 1) msg.imageURL = media.image_versions2.candidates[0].url
            if(mediaType == 2) msg.videoURL = media.video_versions[0].url
        }
        if(!this.messages[thread_id]) this.messages[thread_id] = []
        if(this.messages[thread_id].length >= this.maxMessages ) this.messages[thread_id].shift()
        this.messages[thread_id].push(msg)

        delete msg.thread_id
        msg.reactions = []

        if(this.useCache) return msg

        if(fs.existsSync(`./chat_data/${thread_id}.json`)){
        
          if(fs.readFileSync(`./chat_data/${thread_id}.json`,{encoding:"utf-8"}).startsWith(`[`)) fs.appendFileSync(`./chat_data/${thread_id}.json`,JSON.stringify(msg,null,4)+",\n")
        
        } else fs.writeFileSync(`./chat_data/${thread_id}.json`,"["+JSON.stringify(msg,null,4)+",\n")

        return msg
    }
    setUnsend({threadId,itemId}){
        if(this.useCache){
               return new Promise((reject,resolve) => {
                  let msg_index = this.messages[threadId]?.findIndex(m => m.item_id == itemId)
                  if(msg_index == undefined) resolve()
                  if(msg_index < 0) resolve()
                  this.messages[threadId][msg_index].unsent = true
                  resolve()
               })
        }
        return this.operator(threadId,(obj,{foundMessage,isFirst,writeStream}) => {
          if (obj.item_id === itemId) {
            // Add the reaction to the message object
            obj.unsent = true
            foundMessage[0] = true;
              
          }
    
          // Write the modified or original object to the temporary file
          if(isFirst[0]){
              isFirst[0] = false
              writeStream.write("[\n"+JSON.stringify(obj,null,4) + ',\n');
          }else{
              writeStream.write(JSON.stringify(obj,null,4) + ',\n');
          }
        })
    }
    getUnsentMessage({threadId,userId}){
        if(this.useCache){
            
            let thread = this.messages[threadId]
            
            if(!thread) return
            let msgs = thread.filter(m => m.unsent && m.user_id == userId)
            
            if(msgs.length == 0) return
            let msg = msgs.sort((a,b) => b.timestamp - a.timestamp)[0]
            return msg
            
        }
        return new Promise((resolve,reject) => {
          // Path to the JSON file
          const filePath = `./chat_data/${threadId}.json`;
        
          // Create a readable stream to read the JSON file
          const readStream = fs.createReadStream(filePath, { encoding: 'utf8'});
      
          // Create a JSONStream parser to parse the JSON file stream
          const parser = JSONStream.parse('*');
      
          let foundmessage;
          // Handle each parsed object from the JSON file
          parser.on('data', (obj) => { if (obj.user_id ===  userId && obj.unsent == true) foundmessage = obj });
      
          // Handle the end of the JSON file stream
          parser.on('end', () => resolve(foundmessage));
      
          // Pipe the JSON file stream through the parser
          readStream.pipe(parser);
        })
    } 
    removeReactions(threadID, item_id, reaction) {
      return this.operator(threadID,(obj,{isFirst,writeStream,foundMessage}) => {
      
          if (obj.item_id === item_id) {
            // Remove the reaction from the message object
            obj.reactions = obj.reactions.filter(r => r.user_id !== reaction.user_id);
            foundMessage[0] = true;
          }
    
          // Write the modified or original object to the temporary file
          if(isFirst[0]){
              isFirst[0] = false
              writeStream.write("[\n"+JSON.stringify(obj,null,4) + ',\n');
          }else{
              writeStream.write(JSON.stringify(obj,null,4) + ',\n');
          }
        
      })
    
    }
    addReactions(threadID, item_id, reaction) {
        return this.operator(threadID,(obj,{isFirst,writeStream,foundMessage}) => {

          if (obj.item_id === item_id) {
            // Add the reaction to the message object
            if(obj.reactions.find(r => r.user_id == reaction.user_id)) 
            {
              obj.reactions = obj.reactions.filter(r => r.user_id !== reaction.user_id)
            }
            obj.reactions.push(reaction);
            foundMessage[0] = true;
          }
          // Write the modified or original object to the temporary file
          if(isFirst[0]){
              isFirst[0] = false
              writeStream.write("[\n"+JSON.stringify(obj,null,4) + ',\n');
          }else{
              writeStream.write(JSON.stringify(obj,null,4) + ',\n');
          }
        })
    }
    operator(threadID,fn){
      return new Promise((resolve, reject) => {
        // Path to the JSON file
        const filePath = `./chat_data/${threadID}.json`;
    
        // Create a readable stream to read the JSON file
        const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    
        // Create a JSONStream parser to parse the JSON file stream
        const parser = JSONStream.parse('*');
    
        // Create a writable stream to write the modified JSON content to a temporary file
        const tempFilePath = `./chat_data/temp/${threadID}_temp.json`;
        const writeStream = fs.createWriteStream(tempFilePath, { encoding: 'utf8' });
    
        // Flag to track if the desired message object is found
        let foundMessage = [false];
    
        let isFirst = [true]
        // Handle each parsed object from the JSON file
        parser.on('data', (obj) => fn(obj,{isFirst,writeStream,foundMessage}));
    
        // Handle the end of the JSON file stream
        parser.on('end', () => {
          if (!foundMessage[0]) {
            reject(new Error('Desired message not found.'));
            return;
          }
    
          // Close the write stream
          writeStream.end();
    
          // Replace the original file with the temporary file
          fs.rename(tempFilePath, filePath, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
    
        // Handle any errors while reading the JSON file
        readStream.on('error', (err) => {
          
        });
    
        // Pipe the JSON file stream through the parser
        readStream.pipe(parser);
      });
    }
}
