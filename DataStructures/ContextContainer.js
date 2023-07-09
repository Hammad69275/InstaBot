const config = require(`../config.json`)

module.exports = class DMContextContainer{
    constructor(maxMessages,ig,sql){
        this.context = {},
        this.max = maxMessages
        this.ig = ig
        this.sql = sql
    }
    async addMessage(context,thread,user){
        let threadContext = this.context[thread] || {}
        let userContext = threadContext[user] || []
        if(userContext.length > 1 && context.role == "user") context.name = userContext[0].name
        else if (userContext.length <= 1 && context.role == "user"){
            let u = await this.ig.user.info(user)
            let username = u.full_name.replace(/[^a-zA-Z0-9/-]+/g,"_")
            if(username.length <= 1) username = u.username.replace(/[^a-zA-Z0-9/-]+/g,"_")
            context.name = username
        }
        if(userContext.length >= this.max){
            userContext.shift()
        }
        userContext.push(context)
        
        threadContext[user] = userContext
        this.context[thread] = threadContext
        
        let imitation;

        if(!this.context[thread]?.imitation){
            let {recordset,rowsAffected} = await this.sql.query(`
                SELECT * FROM Imitations
                WHERE thread='${thread}'
            `)

            imitation = config.defaultImitation
    
            if(rowsAffected[0] > 0) imitation = recordset[0].imitation
            
            this.context[thread].imitation = imitation
        }else{
            imitation = this.context[thread].imitation
        }
        console.log(this.context)
        return [{role:"system",content:imitation},...userContext]
    }
    clearAll(thread){
        this.context[thread] = {}
    }
}
