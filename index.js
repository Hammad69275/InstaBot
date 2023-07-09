const fs = require("fs");
const async = require("async");
const sql = require('mssql');

const {IgApiClient} = require("instagram-private-api")
const {withRealtime} = require("instagram-mqtt");
const { Configuration, OpenAIApi } = require("openai");

const ContextContainer = require("./DataStructures/ContextContainer");
const MessagesContainer = require("./DataStructures/MessagesContainer");

const GroupAIHandler = require("./Handlers/GroupAIHandler");
const DMHandler = require("./Handlers/DMHandler");
const GroupSniper = require("./Handlers/GroupSniper");

const PlaygroundAI = require("./Handlers/PlaygroundAI");

const config = require(`./config.json`)

let commands = []

const ig = withRealtime(new IgApiClient())

ig.state.generateDevice(config.DeviceSeed);


const configuration = new Configuration({
    apiKey: config.OpenAI_API_Key,
});

const openai = new OpenAIApi(configuration);
let playground = new PlaygroundAI()

const messages_container = new MessagesContainer(config.MaxMessagesInCache,!config.StoreMessages)
const ContextHandler = new ContextContainer(config.MaxMessagesInContext,ig,sql);
    
let threadStore;
let userStore;

try{ threadStore = JSON.parse(fs.readFileSync(__dirname+"/thread_data.json","utf-8")) } catch(err) { threadStore = {} }
try{ userStore = JSON.parse(fs.readFileSync(__dirname+"/user_data.json","utf-8")) } catch(err) { userStore = {} }

(async () => {
    
    console.log("initializing login flow")

    if (stateExists()) {
        await ig.state.deserialize(loadState());
    }

    let loggedInUser
    try{
        loggedInUser = await ig.account.currentUser()
    }catch(err){
        console.log(err)
        loggedInUser = await ig.account.login(config.Username,config.Password)
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        saveState(serialized);
    }
  
    console.log("Login Successful As: " + loggedInUser.username)
    console.log("Loading Commands...")
    await loadCommands()
    console.log("Commands Loaded!")
    
    if(config.StoreMessages){
        let tempchatdata = fs.readdirSync(__dirname+`/chat_data/temp`,{encoding:"utf-8"})
        if(tempchatdata.length > 0){
            tempchatdata.forEach(t => {
                fs.rmSync(__dirname+`/chat_data/temp/${t}`)
            })
        }
    }

    let selfID = loggedInUser.pk
    let threads
    
    try{
        threads = await ig.feed.directInbox().request()
    }catch(err){
        removeState()
        process.exit()
    }

    
    await ThreadsEvaluator({loggedInUser,threads})

    await sql.connect(config.MSSQL_Connection_String)

    console.log(`connected to Database`)

    const messageQueue = async.queue((task, callback) => {
        const { threadID, item_id, reaction,type,message} = task;
            
            if(type == "add" && config.StoreMessages) messages_container.addReactions(threadID, item_id, reaction).then(() => callback()).catch((err) => callback())
            else if(type == "remove"  && config.StoreMessages) messages_container.removeReactions(threadID, item_id, reaction).then(() => callback()).catch((err) => callback())
            else if(type == "message_add"){ messages_container.add(message); callback() }
            else if(type == "message_unsend") messages_container.setUnsend({threadId:threadID,itemId:item_id}).then(() => callback()).catch((err) => callback())  
    }, 1);

    ig.realtime.on("receive",async(topic,message) => { if(config.StoreMessages) ReactionsHandler(message,messageQueue) })

    ig.realtime.on("message",async (message)=> {  
        const op = message?.message?.op
        if(op == "add"){
            if(message.message.item_type == "action_log"){
                await saveThreadState({message,threadStore,threadFeed:threads})
                fs.writeFileSync(__dirname+"/thread_data.json",JSON.stringify(threadStore,null,4),{encoding:"utf-8"})
            }
        }
        
        let isgroup
        try{
            isgroup = threads.inbox.threads.find(t => t.thread_id == message.message.thread_id).is_group
        }
        catch(err){  
            threads = await ig.feed.directInbox().request()
            let thread = threads.inbox.threads.find(t => t.thread_id == message.message.thread_id)
            isgroup = thread.is_group
            if(isgroup){
                thread.users.push(loggedInUser)
                await saveThreadState({threadFromInstagram:thread,threadStore})
                fs.writeFileSync(__dirname+"/thread_data.json",JSON.stringify(threadStore,null,4),{encoding:"utf-8"})
            }
        }
        if(isgroup){
            // executing the code for messages sent in groups
            // Verifying that the message received is a sent message and not an unsent or seen event and is not sent by the bot itself
            if(op !== "add"){
                if(op == "remove"){
                   try{
                      return await GroupSniper.run({message,messageQueue})
                   }catch(err){
                        return console.log(err)
                   }
                }else return
            }

            // for some reason, instagram will consider the message as a link if it has a dot between two words
            // so it is necessary to pull the text field from the link object and set it as the text field
            // inside the message object so that the code wont break later
            await ig.realtime.direct.markAsSeen({threadId:message.message.thread_id,itemId:message.message.item_id})

            if(message.message?.link) message.message.text = message.message.link.text
            if(["link","text","media","voice_media","media_share","clip","raven_media"].includes(message.message.item_type)) messageQueue.push({type:"message_add",threadID:message.message.thread_id,message:message.message})
            
            if(!["text","link"].includes(message?.message?.item_type)) return
            // checking whether the message is a command or a simple message and executing the appropriate code
            if(message.message?.text.startsWith("!")){

                if((await sql.query(`SELECT * FROM BlacklistedUsers WHERE id='${message.message.user_id}' AND thread='${message.message.thread_id}' `)).rowsAffected[0] > 0) return
                
                let {text} = message.message
                let command = text.substring(1).split(" ")[0]
                let mention = text.match(/\B@\S+\b/g)
                if(mention) mention = mention[0].substring(1)
    
                try{
                    let cmd = commands.find(c => c?.name == command)
                    if(!cmd){
                        cmd = commands.find(c => c.fallback)           
                    }
                    if(cmd.disabled) return
                    if(cmd?.adminOnly){
                        let targetThread = await ig.feed.directThread({thread_id:message.message.thread_id}).request()
                        if(!targetThread.thread.admin_user_ids.includes(message.message.user_id)) return ig.realtime.direct.sendText({text:"This command is only available for GC Admins",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                        await cmd.run({sql,ig,loggedInUser,message,mention,messages_container,selfID,config,text:text.replace(`!${command}`,""),ContextHandler,userStore})
                        return
                    }
                    if(cmd?.replyOnly){
                        if(message.message.replied_to_message) return await cmd.run({sql,ig,loggedInUser,message,mention,messages_container,selfID,text:text.replace(`!${command}`,"")})
                        await ig.realtime.direct.sendText({text:`You need to reply to a message to use this command`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                        return
                    }
                    await cmd.run({sql,command,ig,loggedInUser,message,mention,messages_container,selfID,text:text.replace(`!${command}`,""),playground,userStore})
                }catch(err){  
                    let msg = `Error Occured: ${err}. Please contact the owner or try again`
                    if(err?.response?.data?.error) msg = err.response.data.error     
                    ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    console.log(err)
                }
           }else {
                try{
                    if(message.message.text.startsWith(`@${loggedInUser.username}`) || (message.message.replied_to_message?.user_id == selfID && message.message.user_id !== selfID && !message.message.replied_to_message?.media) ){
                        
                        if((await sql.query(`SELECT * FROM BlacklistedUsers WHERE id='${message.message.user_id}' AND thread='${message.message.thread_id}' `)).rowsAffected[0] > 0) return
                       
                        await GroupAIHandler.run({sql,ig,openai,message,ContextHandler,loggedInUser,userStore,config})
                    }
                }catch(err){
                    let msg = `Error Occured: ${err}. Please contact the owner or try again`
                    if(err?.response?.data?.error?.message) msg = err.response.data.error.message
                    ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    return console.log(err)
                }
           }
        }
         else {
            try {
                if(message.message.user_id == selfID || message.message.op !== `add` || message.message.item_type == "text") return
                await DMHandler.run({ig,message,loggedInUser})
            }catch(err){
                let msg = `Error Occured: ${err}. Please contact the owner or try again`
                if(err?.response?.data?.error?.message) msg = err.response.data.error.message
                ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                return console.log(err)
            }
        }
    })
    ig.realtime.on('error', console.error);

    ig.realtime.on('close', () => console.error('RealtimeClient closed'));

    ig.realtime.on("disconnect", () => {
        console.log("mqtt connection closed")
        process.exit()
    })
    await ig.realtime.connect({irisData: threads})

})()

function saveState(data) {
    fs.writeFileSync(__dirname + "/state.json",JSON.stringify(data))
    return data;
}
function removeState(){
    fs.rmSync(__dirname + "/state.json")
}
function stateExists() {
    if(fs.existsSync(__dirname+"/state.json")) return true
    return false;
}
  
function loadState() {
    let data = fs.readFileSync(__dirname+"/state.json",{encoding:"utf-8"})
    return data;
}


async function ReactionsHandler(message,messageQueue){
    let msg = message[0]
    if(msg.topic.id == "146" && msg.topic.path == "/ig_message_sync"){
        if(msg?.data?.data[0]?.path?.includes("reaction")){
                let user_id = msg.data.data[0]?.path.split("/")[8]
                let item_id = msg.data.data[0]?.path.split("/")[5]
                let thread_id = msg.data.data[0]?.path.split("/")[3]
                let emoji;
                switch(msg?.data?.data[0]?.op){
                    case "add":
                        if(!msg.data.data[0]?.value) emoji = "❤️"
                        else {
                            let value = JSON.parse(msg.data.data[0]?.value)
                            emoji = value.emoji
                        }
                        messageQueue.push({threadID:thread_id,item_id,reaction:{user_id,emoji},type:"add"})
                        break;
                    case "remove":
                        messageQueue.push({threadID:thread_id,item_id,reaction:{user_id},type:"remove"})
                        break;
                }
            }
    }
}


async function loadCommands(){
    
    return new Promise((resolve,reject) => {
        commands = []
        let dir = fs.readdirSync(__dirname + "/Commands",{encoding:"utf-8"})
        for (let i = 0;i<dir.length;i++){
            let file = require(`./Commands/${dir[i]}`)
            commands.push(file)
        }
        resolve()
    })

}

async function ThreadsEvaluator({threads,loggedInUser}){

    threads.inbox.threads.filter(t => t.users.length > 0 && t.is_group).forEach(async thread => {
        thread.users.push(loggedInUser)
        let users = thread.users.map(u => {
            return {
                user_id:u.pk,
                pk:u.pk,
                username:u.username,
                fullName:u.full_name,
            }
        })
    
        for(let i = 0;i<users.length;i++){
            let userFromUserStore = userStore[users[i].user_id]
            let userFromInstagram = users[i]
            if(userFromUserStore){
                if(userFromUserStore.username !== userFromInstagram.username) userFromUserStore.oldUsernames.push(userFromUserStore.username)
                userFromUserStore.username = userFromInstagram.username
                userFromUserStore.fullName = userFromInstagram.fullName
            }else {
                userStore[userFromInstagram.user_id] = {
                    ...userFromInstagram,
                    oldUsernames:[]
                }
            }
        }
        
        await saveThreadState({threadFromInstagram:thread,threadStore})
        
    })
    
    fs.writeFileSync(__dirname+"/user_data.json",JSON.stringify(userStore,null,4),{encoding:"utf-8"})
    fs.writeFileSync(__dirname+"/thread_data.json",JSON.stringify(threadStore,null,4),{encoding:"utf-8"})

}

async function saveThreadState({threadFromInstagram,threadStore,message}){
    let currentTimestamp = Date.now()
    
    const titleEvent = ({thread,title,changedBy}) => {
        let newTitle = title
        let changedOn = currentTimestamp
        thread.totalTitles.push({title:newTitle,changedOn,changedBy})
        thread.title = newTitle
    }
    
    const leaveEvent = ({thread,user}) => {
        thread.users = thread.users.filter(m => m.user_id !== (user.pk || user.user_id))
        if(thread.leftUsers.find(u => u.user_id == (user.pk || user.user_id))){
            thread.leftUsers.find(lu => lu.user_id == (user.pk || user.user_id)).amountOfTime++
            thread.leftUsers.find(lu => lu.user_id == (user.pk || user.user_id)).leftOn.push(currentTimestamp)
        }else thread.leftUsers.push({user_id:user.pk||user.user_id,leftOn:[currentTimestamp],amountOfTime:1})
    }
    
    const addEvent = ({thread,users,inviter}) => {
        users.forEach(user => {
            thread.users.push({ user_id:user.pk , memberSince: currentTimestamp , admin:false , addedBy:inviter})
        })
    }

    const removedEvent = ({thread,user,removedBy}) => {
        thread.users = thread.users.filter(m => m.user_id !== user.pk)
        if(thread.removedUsers.find(u => u.user_id == user.pk)){
            thread.removedUsers.find(lu => lu.user_id == user.pk).amountOfTime++
            thread.removedUsers.find(lu => lu.user_id == user.pk).removedBy.push({user_id:removedBy,timestamp:currentTimestamp})
        }else thread.removedUsers.push({user_id:user.pk,removedOn:[currentTimestamp],removedBy:[{user_id:removedBy,timestamp:currentTimestamp}],amountOfTime:1})
    }

    const mergeThreads = (threadFromInstagram, threadFromDataset) => {
        if (threadFromInstagram.thread_title !== threadFromDataset.title) {
          titleEvent({
            thread: threadFromDataset,
            title: threadFromInstagram.thread_title,
            changedBy: null,
          });
        }
        
        const newUsers = threadFromInstagram.users.filter(
          (u) =>
            !threadFromDataset.users.some((tu) => tu.user_id === u.pk)
        );
      
        const leftUsers = threadFromDataset.users.filter(
          (u) =>
            !threadFromInstagram.users.some((tu) => tu.pk === u.user_id)
        );
      
      
        if (newUsers.length) {
          addEvent({
            thread: threadFromDataset,
            users: newUsers,
            inviter: null,
          });
        }
      
        if (leftUsers.length) {
          leftUsers.forEach((user) => {
            leaveEvent({
              thread: threadFromDataset,
              user,
            });
          });
        }
        
        threadFromDataset.users.forEach(u => {
            if(threadFromInstagram.admin_user_ids.includes(u.user_id)) u.admin = true
            else u.admin = false
        })

        return threadFromDataset;
      };
    
    if(threadFromInstagram){
        let threadsFromDataset = threadStore[threadFromInstagram.thread_id]
        if(!threadsFromDataset){
            let threadToSave = {
                title:threadFromInstagram.thread_title,
                thread_id:threadFromInstagram.thread_id,
                users:threadFromInstagram.users.map(u => {
                    return {
                        user_id:u.pk,
                        memberSince: currentTimestamp,
                        admin:threadFromInstagram.admin_user_ids.includes(u.pk),
                        addedBy:null
                    }
                }),
                leftUsers:[],
                totalTitles:[{title:threadFromInstagram.thread_title,changedOn:currentTimestamp,changedBy:null}],
                removedUsers:[]
            }
            threadStore[threadFromInstagram.thread_id] = threadToSave
        }else {
            let mergedThread = mergeThreads(threadFromInstagram,threadsFromDataset)
            threadStore[threadFromInstagram.thread_id] = mergedThread
        }
    }else if(message){
        let {action_log,thread_id} = message.message
        let threadFromDataset = threadStore[thread_id]
        if(!threadFromDataset) return
        let mentions = []
        action_log.bold.forEach(b => {
            mentions.push(action_log.description.substring(b.start,b.end))
        })
        mentions.forEach(m => action_log.description = action_log.description.replace(m,""))

        let {description} = action_log

        if(description.startsWith(" named the group")){
           let changer = await ig.user.searchExact(mentions[0])
           titleEvent({thread:threadFromDataset,title:description.substring(17),changedBy:changer.pk})
        }else if(description.startsWith(" left the group")){
           let user = await ig.user.searchExact(mentions[0])
           leaveEvent({thread:threadFromDataset,user})
        }else if(description.startsWith(" added")){
            mentions.shift()
            let users = await Promise.all(mentions.map(user => {
                return ig.user.searchExact(user)
            })) 
            let inviter = await ig.user.searchExact(mentions[0])
            addEvent({thread:threadFromDataset,users,inviter:inviter.pk})
        }else if(description.startsWith(" removed")){
            let user = await ig.user.searchExact(mentions[1]) 
            let removedBy = await ig.user.searchExact(mentions[0])
            removedEvent({thread:threadFromDataset,user,removedBy:removedBy.pk})
        }
        threadStore[thread_id] = threadFromDataset
    }
   
}
