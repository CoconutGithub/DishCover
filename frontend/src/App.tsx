import React, { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { FaCamera, FaMapMarkerAlt, FaUtensils, FaSearchLocation } from "react-icons/fa";

// --- [스타일 컴포넌트] CSS 영역 ---
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  background-color: #ffffff;
  min-height: 100vh;
`;

const Title = styled.h1`
  color: #212529;
  font-size: 2.5rem;
  margin-bottom: 10px;
  font-weight: 800;
`;

const SubTitle = styled.p`
  color: #868e96;
  margin-bottom: 40px;
  font-size: 1.1rem;
`;

const UploadBox = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 250px;
  background-color: #f8f9fa;
  border: 3px dashed #dee2e6;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: #ff6b6b;
    background-color: #fff5f5;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const IconWrapper = styled.div`
  font-size: 3rem;
  color: #adb5bd;
  margin-bottom: 10px;
`;

const AnalyzeButton = styled.button`
  margin-top: 30px;
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #ff6b6b 0%, #fa5252 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(250, 82, 82, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;

  &:disabled {
    background: #e9ecef;
    color: #adb5bd;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(250, 82, 82, 0.4);
  }
`;

const ResultSection = styled.div`
  margin-top: 50px;
  text-align: left;
  animation: fadeIn 0.5s ease-in-out;
`;

const KeywordBadge = styled.span`
  display: inline-block;
  background-color: #e7f5ff;
  color: #1971c2;
  padding: 8px 16px;
  border-radius: 20px;
  margin-right: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.95rem;
`;

const RestaurantCard = styled.a`
  display: block;
  background: white;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1f3f5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    border-color: #ff6b6b;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #343a40;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Address = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #868e96;
  display: flex;
  align-items: center;
  gap: 5px;
`;

// --- [TypeScript 타입 정의] ---
interface Restaurant {
  place_name: string;
  road_address_name: string;
  address_name: string;
  place_url: string;
  phone: string;
  category_name: string;
}

// --- [메인 컴포넌트] ---
function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // 파일 선택 시 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      // 초기화
      setKeywords([]);
      setRestaurants([]);
    }
  };

  // 분석 요청
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);

    // 1. 브라우저에서 현재 위치(위도, 경도) 가져오기
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("📍 현재 위치:", latitude, longitude);

        // 2. 백엔드로 보낼 데이터 준비 (FormData)
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("lat", latitude.toString());
        formData.append("lon", longitude.toString());

        try {
          // 3. FastAPI 서버로 요청 전송
          // 주의: 백엔드 포트가 8000번인지 확인하세요!
          const response = await axios.post("http://127.0.0.1:8000/api/recommend", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          console.log("✅ 서버 응답:", response.data);
          setKeywords(response.data.analysis_keywords);
          setRestaurants(response.data.recommendations);

        } catch (error) {
          console.error("❌ API 에러:", error);
          alert("서버 연결에 실패했습니다. 백엔드가 켜져있는지 확인해주세요.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("❌ 위치 에러:", error);
        alert("위치 정보 권한을 허용해주세요! 내 주변 맛집을 찾으려면 위치가 필요합니다.");
        setLoading(false);
      }
    );
  };

  return (
    <Container>
      <Title>📸 DishCover</Title>
      <SubTitle>사진으로 찾는 내 취향 저격 맛집</SubTitle>

      {/* 1. 이미지 업로드 영역 */}
      <UploadBox>
        {preview ? (
          <PreviewImage src={preview} alt="음식 미리보기" />
        ) : (
          <>
            <IconWrapper><FaCamera /></IconWrapper>
            <span style={{ color: "#adb5bd", fontWeight: 500 }}>
              여기를 클릭해 음식 사진을 올려주세요
            </span>
          </>
        )}
        <HiddenInput type="file" accept="image/*" onChange={handleFileChange} />
      </UploadBox>

      {/* 2. 분석 버튼 */}
      <AnalyzeButton onClick={handleAnalyze} disabled={loading || !selectedFile}>
        {loading ? "AI가 미식 데이터를 분석 중입니다... 🍳" : "내 주변 맛집 추천 받기 🚀"}
      </AnalyzeButton>

      {/* 3. 결과 표시 영역 */}
      {(keywords.length > 0 || restaurants.length > 0) && (
        <ResultSection>
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ color: "#495057", marginBottom: "15px" }}>🧐 분석된 취향 키워드</h3>
            {keywords.map((k, i) => (
              <KeywordBadge key={i}>#{k}</KeywordBadge>
            ))}
          </div>

          <h3 style={{ color: "#495057", marginBottom: "15px" }}>📍 추천 맛집 리스트</h3>
          {restaurants.length === 0 ? (
            <p style={{ color: "#868e96" }}>검색된 맛집이 없습니다. 거리를 늘려보거나 다른 사진을 써보세요!</p>
          ) : (
            restaurants.map((res, i) => (
              <RestaurantCard key={i} href={res.place_url} target="_blank" rel="noopener noreferrer">
                <CardHeader>
                  <Name><FaUtensils color="#ff6b6b" size={16}/> {res.place_name}</Name>
                  <span style={{ fontSize: "0.85rem", color: "#ced4da" }}>{res.category_name.split(">").pop()}</span>
                </CardHeader>
                <Address><FaMapMarkerAlt color="#868e96"/> {res.road_address_name || res.address_name}</Address>
              </RestaurantCard>
            ))
          )}
        </ResultSection>
      )}
    </Container>
  );
}

export default App;