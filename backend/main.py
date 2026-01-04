from fastapi import FastAPI
from logger import logger

app=FastAPI()

@app.get("/")
def check_status():
    logger.info("API is Running")
    return {"status": "API is running"}

logger.info('Server Start up Complete')