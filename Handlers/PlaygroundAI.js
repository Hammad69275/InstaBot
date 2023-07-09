const axios = require("axios").default
const config = require(`../config.json`)

module.exports = class PlaygroundAI{
    constructor(){
        this.cookies = config.PlaygroundAICookies
        this.client= axios.create({
            baseURL: 'https://playgroundai.com/api/',
            timeout: 60000,
            headers: {
                Cookie:Object.keys(this.cookies).map(k => {
                    return `${k}=${this.cookies[k]}; `
                }).join(""),
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9,ur-PK;q=0.8,ur;q=0.7",
                "content-type": "application/json",
                "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://playgroundai.com/create?",
                "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
                
            }
          });
    }
    async init(){
        let session = await this.client.get("/auth/session")
        return session.data
    }
    async generateImage({img,prompt}){
        
        let batchId = generateBatchId()

        let body = {
            batchId,
            cfg_scale:10,
            generateVariants:false,
            guidance_scale:10,
            height:512,
            hide:false,
            isPrivate:false,
            mask_strength:0.7,
            mode:0,
            modelType:"playground-v1",
            num_images:1,
            prompt,
            sampler:1,
            seed:Date.now(),
            start_schedule:0.7,
            steps:100,
            strength:1,
            width:512,
        }
        if(img) body.init_image = img
        
        let generateBatch = await this.client.post("/models",body)
        if(!generateBatch?.date?.images[0]?.url) return generateBatch.data

        let fetchBatch = await this.client.get(`/images/batch?batchId=${batchId}&batchSize=1`)
        
        return fetchBatch
    }
}

function generateBatchId(){
    let letters = `1234567890abcdefghijklmnopqrstuvwxyz`
    let batchId = ``
    for (let i = 0; i<10;i++){
        batchId += letters[Math.floor(Math.random() * letters.length)]
    }
    return batchId
}

