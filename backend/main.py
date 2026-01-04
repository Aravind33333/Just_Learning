from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def check_status():
    print("I am a simple print statement inside the route.") # This goes to file now!
    return {"status": "API is running"}