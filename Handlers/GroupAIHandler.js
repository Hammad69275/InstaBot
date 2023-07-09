const axios = require(`axios`).default
const cheerio = require(`cheerio`)

module.exports = {
    run:async ({ig,openai,message,ContextHandler,loggedInUser}) => {

            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:true})    
 
	        let messages = await ContextHandler.addMessage({role:"user",content:message.message.text.replace(`@${loggedInUser.username}`,``)},message.message.thread_id,message.message.user_id)

            let resp = await openai.createChatCompletion({
                model:"gpt-3.5-turbo-0613",
                messages,
                functions:[
                    {
                        name:"movie",
                        description:"Sends the link of a movie",
                        parameters: {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "the name of the movie",
                                },
                            },
                            "required": ["name"],
                        },
                    
                    },
                    {
                    name:"anime",
                    description:"Sends the link of an anime",
                    parameters: {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "the name of the anime",
                            },
                        },
                        "required": ["name"],
                    },
                
                    }
                ],
                max_tokens:1000
            })
            if(resp.data.choices[0].message.function_call){
                await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})
                
                let fn = resp.data.choices[0].message.function_call
                let name = fn.name
                let args = JSON.parse(fn.arguments)
                if(name == `movie`){
                    let movies = await fetchMovies(args)
                    if(movies.length == 0){
                        await ig.realtime.direct.sendText({text:`Not Found`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                        return ContextHandler.addMessage({role:"function",name,content:`Not Found`},message.message.thread_id,message.message.user_id) 
                    } 
                    let msg = movies.map(m => { return `${m.title}: https://fmovies.to${m.link}` }).join(`\n\n`)
                    await ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    return ContextHandler.addMessage({role:"function",name,content:msg},message.message.thread_id,message.message.user_id) 
                
                }else if(name == `anime`){
                    let anime = await fetchAnime(args)
                    if(anime.length == 0){
                        await ig.realtime.direct.sendText({text:`Not Found`,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                        return ContextHandler.addMessage({role:"function",name,content:`Not Found`},message.message.thread_id,message.message.user_id) 
                    } 
                    let msg = anime.map(m => { return `${m.title}: https://9anime.to${m.link}` }).join(`\n\n`)
                    await ig.realtime.direct.sendText({text:msg,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                    return ContextHandler.addMessage({role:"function",name,content:msg},message.message.thread_id,message.message.user_id) 
                
                }
                return
            }
            resp = resp.data.choices[0].message.content

            ContextHandler.addMessage({role:"assistant",content:resp},message.message.thread_id,message.message.user_id)
            
            await ig.realtime.direct.indicateActivity({threadId:message.message.thread_id,isActive:false})

            await ig.realtime.direct.sendText({text:resp,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            return
        }
}

async function fetchMovies({name}){
    let res = await axios.get(`https://fmovies.to/ajax/film/search?keyword=${name}`)
    let movieHTML = res.data.result.html
    // Load the HTML into Cheerio
    const $ = cheerio.load(movieHTML);

    // Extract movie titles, links, and image URLs
    const movies = [];

    $('.item').each((index, element) => {
    const title = $(element).find('.name').text();
    const link = $(element).attr('href');
    const image = $(element).find('img').attr('src');

    movies.push({
        title,
        link,
        image,
    });
    });    
    
    return movies
}
async function fetchAnime({name}){
    let res = await axios.get(`https://9anime.to/ajax/anime/search?keyword=${name}`)
    let animeHTML = res.data.result.html
    // Load the HTML into Cheerio
    const $ = cheerio.load(animeHTML);

    const animeList = [];

    $('div.scaff.items a.item').each((index, element) => {
    const link = $(element).attr('href');
    const title = $(element).find('div.name.d-title').text().trim();

    animeList.push({ title, link });
    });
    
    return animeList
}