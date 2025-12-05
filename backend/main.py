from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# 모듈 가져오기
from agent import analyze_food_preference
from tools import search_restaurants

app = FastAPI()

# CORS 설정 (모든 포트 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "FoodieLens Backend is Running!"}

@app.post("/api/recommend")
async def recommend_food(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...)
):
    print(f"📸 이미지 받음: {file.filename}, 위치: {lat}, {lon}")
    
    # [1단계] 이미지 읽기
    image_bytes = await file.read()
    
    # [2단계] Gemini에게 이미지 분석 요청
    print("🤖 1. Gemini 분석 시작...")
    keywords = analyze_food_preference(image_bytes)
    print(f"🔑 분석된 키워드: {keywords}")
    
    # [3단계] 키워드 검색 및 재검색 로직
    recommendations = []
    seen_place_ids = set()
    
    if keywords:
        for keyword in keywords:
            print(f"🔎 1차 검색: '{keyword}'")
            
            # 1. 원래 키워드로 검색 (예: "담백한 만두")
            search_results = search_restaurants(keyword, lat, lon)
            
            # 2. 결과가 0개라면? 단어를 쪼개서 핵심 명사로 재검색
            if not search_results and " " in keyword:
                # 공백으로 나눈 뒤 가장 마지막 단어 선택 ("담백한 만두" -> "만두")
                simple_keyword = keyword.split()[-1] 
                
                print(f"   ↳ ⚠️ 결과 없음. 2차 검색 시도: '{simple_keyword}'")
                search_results = search_restaurants(simple_keyword, lat, lon)

            # 3. 결과 저장 (중복 제거)
            for place in search_results:
                place_id = place.get("id")
                if place_id and place_id not in seen_place_ids:
                    recommendations.append(place)
                    seen_place_ids.add(place_id)
    
    print(f"✅ 총 {len(recommendations)}개의 맛집을 찾았습니다.")

    return {
        "analysis_keywords": keywords,
        "recommendations": recommendations
    }