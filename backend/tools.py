import os
import requests
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
kakao_api_key = os.getenv("KAKAO_API_KEY")

def search_restaurants(keyword: str, lat: float, lon: float, radius: int = 1000):
    """
    카카오 로컬 API를 사용하여 키워드로 맛집을 검색합니다.
    """
    # ▼▼▼ [수정 1] 키가 잘 읽혔는지, 헤더가 어떻게 만들어지는지 출력해보기 ▼▼▼
    auth_header = f"KakaoAK {kakao_api_key}"
    print(f"🔑 [디버깅] 적용된 API 키: {kakao_api_key}") 
    print(f"📨 [디버깅] 전송될 헤더: {auth_header}")
    # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    
    headers = {
        "Authorization": f"KakaoAK {kakao_api_key}"
    }
    
    params = {
        "query": keyword,           # 검색어 (예: 매운 떡볶이)
        "y": lat,                   # 위도
        "x": lon,                   # 경도
        "radius": radius,           # 반경 (미터 단위, 기본 1km)
        "category_group_code": "FD6", # FD6 = 음식점 코드 (카페는 CE7)
        "sort": "distance"          # 거리순 정렬
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() # 에러 발생 시 예외 처리
        
        data = response.json()
        return data.get("documents", []) # 검색 결과 리스트 반환
        
    except Exception as e:
        print(f"❌ 카카오 API 검색 중 오류 발생: {e}")
        return []