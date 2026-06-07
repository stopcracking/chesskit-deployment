import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();
    const { from, to } = body;
    
    console.log("Move:", from, "to", to);
    
    return NextResponse.json({ 
        success: true, 
        from: from, 
        to: to 
    });
}

export async function GET() {
    return NextResponse.json({ status: "ok" });
}