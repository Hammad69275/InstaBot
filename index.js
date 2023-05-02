const {IgApiClient} = require("instagram-private-api")
const {withRealtime} = require("instagram-mqtt");
const { Configuration, OpenAIApi } = require("openai");
const ContextContainer = require("./DataStructures/ContextContainer");
const GroupAIHandler = require("./Handlers/GroupAIHandler");
const fs = require("fs");
const DMHandler = require("./Handlers/DMHandler");
const MessagesContainer = require("./DataStructures/MessagesContainer");
const GroupSniper = require("./Handlers/GroupSniper");
const config = require("./config.json")

const ig = withRealtime(new IgApiClient())

ig.state.generateDevice("poetic rizz");

const configuration = new Configuration({
    apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

let commands = []

const messages_container = new MessagesContainer(config.MaxMessagesInCache)
const ContextHandler = new ContextContainer(config.MaxMessagesInContext);


function saveState(data) {
    fs.writeFileSync(__dirname + "/state.json",JSON.stringify(data))
    return data;
  }
  
  function stateExists() {
    if(fs.existsSync(__dirname+"/state.json")) return true
    return false;
  }
  
  function loadState() {
    let data = fs.readFileSync(__dirname+"/state.json",{encoding:"utf-8"})
    return data;
  }

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
        loggedInUser = await ig.account.login(process.env.USER_NAME,process.env.PASSWORD)
        const serialized = await ig.state.serialize();
        delete serialized.constants; 
        saveState(serialized);
    }
  
    console.log("Login Successful As: " + loggedInUser.username)
    
    console.log("Loading Commands...")
    await loadCommands()
    console.log("Commands Loaded!")

    let meID = loggedInUser.pk
    let threads = await ig.feed.directInbox().request()

    ig.realtime.on("receive",async(t,message) => {
        let msg = message[0]
        if(msg.topic.id == "146" && msg.topic.path == "/ig_message_sync"){
            let p_threads = (await ig.feed.directPending().request()).inbox.threads
            for(let i = 0;i<p_threads.length;i++){
                let id = p_threads[i].thread_id
                console.log(id)
                try{
                    await ig.directThread.approve(id)
                    await ig.entity.directThread(id).broadcastText("Hello! I have accepted your message request. You can start sending reels,stories and posts and I will download and send them to you!")
                }catch(err){
                    console.log(err)
                }
            }
        }
    })

    ig.realtime.on("message",async (message)=> {     
        if(message?.message?.user_id == meID) return
        const op = message?.message?.op
        if(op == "replace") return
        let isgroup
        try{
            isgroup = threads.inbox.threads.find(t => t.thread_id == message.message.thread_id).is_group
        }
        catch(err){
            threads = await ig.feed.directInbox().request()
            isgroup = threads.inbox.threads.find(t => t.thread_id == message.message.thread_id).is_group
        }
        if(isgroup){
            
            // executing the code for messages sent in groups
            // Verifying that the message received is a sent message and not an unsent or seen event and is not sent by the bot itself
            if(op !== "add"){
                if(op == "remove"){
                   try{
                      return await GroupSniper.run({message,messages_container})
                   }catch(err){
                        return console.log(err)
                   }
                }else return
            }
            // for some reason, instagram will consider the message as a link if it has a dot between two words
            // so it is necessary to pull the text field from the link object and set it as the text field
            // inside the message object so that the code wont break later
            
            if(message.message?.link) message.message.text = message.message.link.text
            if(["link","text","media","voice_media"].includes(message.message.item_type)) messages_container.add(message.message)
            if(!["text","link"].includes(message?.message?.item_type)) return
            
            // checking whether the message is a command or a simple message and executing the appropriate code
            if(message.message?.text.startsWith("!")){
                
                let {text} = message.message
                let command = text.substring(1).split(" ")[0]
                if(!commands.find(c => c.name == command)) return 
                let mention = text.match(/\B@\S+\b/g)
                if(mention) mention = mention[0].substring(1)
    
                try{
                    let cmd = commands.find(c => c.name == command)
                    if(cmd.replyOnly){
                        if(message.message.replied_to_message) await cmd.run({ig,loggedInUser,message,mention,messages_container,meID})
                    }
                    else await cmd.run({ig,loggedInUser,message,mention,messages_container,meID})
                }catch(err){
                    ig.realtime.direct.sendText({text:"An Unknown Error Occured.",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    return console.log(err)
                }
           }else {
                try{
                    if(message.message.text.startsWith(`@${loggedInUser.username}`) || message.message.replied_to_message?.user_id == meID ){
                        await GroupAIHandler.run({ig,openai,message,ContextHandler,loggedInUser})
                    }
                }catch(err){
                    let msg = "An Unknown Error Occured."
                    if(err.response.data.error.message) msg = err.response.data.error.message
                    ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    return console.log(err)
                }
           }
        }
         else {
            try {
                await DMHandler.run({ig,message,loggedInUser})
            }catch(err){
                ig.realtime.direct.sendText({text:"An Unknown Error Occured.",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                return console.log(err)
            }
        }
    })
    ig.realtime.on('error', console.error);

    ig.realtime.on('close', () => console.error('RealtimeClient closed'));

    await ig.realtime.connect({irisData: threads})

})()


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

