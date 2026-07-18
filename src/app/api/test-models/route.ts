import { NextResponse } from 'next/server';

export async function GET() {
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return NextResponse.json(data);
}
