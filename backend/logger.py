import logging
from logging.handlers import RotatingFileHandler
import os

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    print("Creating logs directory...")
    os.makedirs('logs')
else:
    print("Logs directory already exists.")

def setup_logger():
    # 1. Create the logger
    logger = logging.getLogger("my_logger")
    logger.setLevel(logging.INFO) 
    
    # 2. Prevent adding duplicate handlers if logger is imported multiple times
    if not logger.handlers:
        # Create handlers
        file_handler = RotatingFileHandler(
            'logs/app.log', 
            maxBytes=5*1024*1024, 
            backupCount=2
        )
        console_handler = logging.StreamHandler()
        
        # Create formatters and add it to handlers
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

# Initialize the logger instance
logger = setup_logger()