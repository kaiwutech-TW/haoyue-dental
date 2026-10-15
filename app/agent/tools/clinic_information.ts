import {defineTool} from 'eve/tools';
import {z} from 'zod';
import {read} from '../../lib/dental/store';
export default defineTool({description:'取得虛構牙醫診所已核准的行政資訊；不包含患者資料或預約寫入權限。',inputSchema:z.object({}),async execute(){return read(c=>c.knowledge.filter(k=>k.approved).map(k=>({question:k.question,answer:k.answer,source:k.source})));}});
