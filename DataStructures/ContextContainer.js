module.exports = class DMContextContainer{
    constructor(maxMessages){
        this.context = {},
        this.max = maxMessages
    }
    addMessage(context,user){
        let userContext = this.context[user] || []
        if(userContext.length >= this.max){
            userContext.shift()
        }
        userContext.push(context)
        this.context[user] = userContext
        return userContext
    }
}