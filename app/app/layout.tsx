import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
export const metadata:Metadata={title:'好約｜把預約交給我，把安心留給你',description:'台灣牙醫 AI 櫃台 · NVIDIA × Nebius hackathon 示範作品'};
export default function Layout({children}:{children:ReactNode}){return <html lang="zh-TW"><body>{children}</body></html>;}
