from fastapi import FastAPI, HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs
import uvicorn
from fastapi.responses import JSONResponse

app = FastAPI()

def extract_video_id(url):
    """Extract video ID from various YouTube URL formats"""
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        return parsed_url.path[1:]
    if parsed_url.hostname in ('www.youtube.com', 'youtube.com'):
        if parsed_url.path == '/watch':
            return parse_qs(parsed_url.query)['v'][0]
    return None

@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return JSONResponse(content={
            'success': True,
            'transcript': ' '.join(entry['text'] for entry in transcript)
        })
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                'success': False,
                'error': str(e)
            }
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001) 