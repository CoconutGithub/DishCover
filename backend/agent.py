import os
import base64
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. .env 파일 로드 (현재 폴더의 .env를 강제로 찾기)
load_dotenv(os.path.join(os.path.dirname(__file__), '.env')) # 수정됨

google_api_key = os.getenv("GOOGLE_API_KEY")

# [디버깅] 키가 제대로 불러와졌는지 확인하는 코드
if not google_api_key:
    print("❌ 오류: .env 파일을 찾을 수 없거나 GOOGLE_API_KEY가 비어있습니다!")
    print(f"현재 위치: {os.getcwd()}")
    print("프로그램을 종료합니다.")
    sys.exit(1) # 강제 종료
else:
    print(f"✅ API Key 로드 성공! (앞 5자리: {google_api_key[:5]}...)")

# 2. Gemini 모델 설정 (Gemini 1.5 Flash가 빠르고 저렴해서 실습용으로 딱입니다)
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=google_api_key,
    temperature=0.3  # 0에 가까울수록 분석적인 답변을 줍니다.
)

def analyze_food_preference(image_bytes: bytes) -> list[str]:
    """
    이미지(byte)를 받아서 Gemini에게 분석을 맡기고,
    맛집 검색용 키워드(List)를 받아오는 함수
    """
    
    # 이미지를 AI에게 보내려면 Base64라는 문자열 형식으로 바꿔야 합니다.
    image_data = base64.b64encode(image_bytes).decode("utf-8")
    
    # 3. 프롬프트 작성 (여기가 AI에게 지시를 내리는 곳!)
    prompt_text = """
    이 사진은 사용자가 좋아하는 음식 사진이야.
    사진 속 음식의 [종류, 맛, 재료, 분위기]를 분석해줘.
    
    그리고 이 사용자가 지금 먹고 싶어 할 만한 '한국의 맛집 검색용 키워드'를 3개만 추천해줘.
    
    [조건]
    1. 결과는 오직 쉼표(,)로 구분된 키워드만 줘.
    2. 불필요한 문장은 쓰지 마.
    
    예시: 매운 떡볶이, 치즈 돈까스, 강남역 분위기 좋은 파스타
    """

    # 4. 메시지 구성 (텍스트 + 이미지)
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
        ]
    )

    # 5. AI에게 질문 던지기
    print("🤖 Gemini가 사진을 분석 중입니다...")
    response = llm.invoke([message])
    
    # 6. 결과 정리 ("김치찌개, 한식" -> ["김치찌개", "한식"])
    keywords = [k.strip() for k in response.content.split(",")]
    return keywords

# 테스트용 코드 (나중에 지워도 됨)
if __name__ == "__main__":
    print("이 파일은 모듈용입니다. main.py에서 실행해주세요.")