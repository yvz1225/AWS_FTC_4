"""환경 변수 관리"""
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
NOTION_PARENT_PAGE_ID = os.getenv("NOTION_PARENT_PAGE_ID", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")
SES_SENDER_EMAIL = os.getenv("SES_SENDER_EMAIL", "")

# DynamoDB 테이블명
ACTIVITY_LOGS_TABLE = os.getenv("ACTIVITY_LOGS_TABLE", "activity_logs")
AVAILABILITY_TABLE = os.getenv("AVAILABILITY_TABLE", "availability")
CONVERSATIONS_TABLE = os.getenv("CONVERSATIONS_TABLE", "conversations")
PROJECTS_TABLE = os.getenv("PROJECTS_TABLE", "projects")
