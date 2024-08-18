import OpenAI from "openai";
import { config } from "dotenv";

config();

const api = process.env.API_KEY
const assistant_id = process.env.ASSISTANT_ID

const openai = new OpenAI({
    apiKey: api
})


async function thread() {
    const thread = await openai.beta.threads.create() 
}
export async function assistantOpenai(text) {
    const thread = await openai.beta.threads.create()
    const messages = await openai.beta.threads.messages.create(
        thread.id,
        {role:'user', content: text}
    )
    let run = await openai.beta.threads.runs.createAndPoll(
        thread.id, //Id del hilo 
        {
            assistant_id: assistant_id, //Id del asistente
            // instructions: text
        }
    )

    if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(
          run.thread_id
        );
        let response = "";
        for (const message of messages.data.reverse()) {
            if (message.role === 'assistant'){
                response +=`${message.content[0].text.value}`;
            }
        }
        return response
      } else {
        return run.status
      }
}



