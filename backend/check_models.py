import os
from dotenv import load_dotenv
import google.generativeai as genai

# .env 로드
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ API 키가 없습니다. .env 파일을 확인해주세요.")
else:
    genai.configure(api_key=api_key)
    print("🔍 현재 사용 가능한 모델 목록:")
    print("-" * 30)
    
    try:
        for m in genai.list_models():
            # 대화(generateContent)가 가능한 모델만 출력
            if 'generateContent' in m.supported_generation_methods:
                print(f"모델명: {m.name}")
    except Exception as e:
        print(f"❌ 에러 발생: {e}")