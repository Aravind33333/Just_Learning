import logging
import sys
import os
from logging.handlers import RotatingFileHandler
import uvicorn

# --- 1. Setup the Log File ---
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure the root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s",
    handlers=[
        RotatingFileHandler('logs/app.log', maxBytes=5*1024*1024, backupCount=2),
        logging.StreamHandler(sys.stdout) # Keep printing to terminal too
    ]
)

logger = logging.getLogger("root")

# --- 2. The Magic: Catch 'print' statements ---
class StreamToLogger(object):
    """
    Fake file-like stream object that redirects writes to a logger instance.
    """
    def __init__(self, logger, level):
        self.logger = logger
        self.level = level
        self.linebuf = ''

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            # This logs the print statement as an INFO log
            self.logger.log(self.level, line.rstrip())

    def flush(self):
        pass

# Redirect stdout (print) and stderr (errors) to the logger
sys.stdout = StreamToLogger(logger, logging.INFO)
sys.stderr = StreamToLogger(logger, logging.ERROR)

# --- 3. Start the Server ---
if __name__ == "__main__":
    print("This print statement will now be inside the log file!")
    
    # We run Uvicorn from here. 
    # Because we hijacked stdout above, Uvicorn's logs will also go to the file.
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)