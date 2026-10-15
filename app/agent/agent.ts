import {defineAgent} from 'eve';
import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
const nebius=createOpenAICompatible({name:'nebius',baseURL:process.env.NEBIUS_BASE_URL||'https://api.tokenfactory.nebius.com/v1/',apiKey:process.env.NEBIUS_API_KEY,includeUsage:true});
export default defineAgent({model:nebius(process.env.NEBIUS_DECISION_MODEL||'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B'),modelContextWindowTokens:16000,limits:{maxInputTokensPerSession:8000,maxOutputTokensPerSession:1000}});
