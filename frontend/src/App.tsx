import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // CSS 파일 임포트 필수!
import { FaCamera, FaMapMarkerAlt, FaUtensils, FaExternalLinkAlt } from "react-icons/fa";

// TypeScript 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

interface Restaurant {
  place_name: string;
  road_address_name: string;
  address_name: string;
  place_url: string;
  phone: string;
  category_name: string;
  x: string;
  y: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  const [myLocation, setMyLocation] = useState<{lat: number, lon: number} | null>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  // --- [1. 지도 초기화 및 디버깅] ---
  useEffect(() => {
    console.log("🚀 [1] useEffect 시작");

    const initMap = () => {
      console.log("🚀 [3] initMap 함수 실행됨");

      const container = document.getElementById('kakao-map');
      
      // 1. 컨테이너 존재 여부 확인
      if (!container) {
        console.error("❌ [ERROR] 지도 컨테이너(#kakao-map)를 찾을 수 없음!");
        return;
      }
      console.log("✅ [INFO] 지도 컨테이너 찾음:", container);

      // 2. 컨테이너 높이 확인 (이게 0이면 화면에 안 보임)
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      console.log(`📏 [CHECK] 지도 영역 크기: ${width}px x ${height}px`);

      if (height === 0) {
        console.warn("⚠️ [WARNING] 지도 높이가 0px입니다! CSS(height: 100%) 설정을 확인하세요.");
        container.style.height = "100%"; // 강제로 높이 줘보기 (임시 조치)
      }

      // 3. 지도 생성 시도
      try {
        const options = {
          center: new window.kakao.maps.LatLng(37.566826, 126.9786567), 
          level: 4
        };
        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);
        console.log("✅ [SUCCESS] 카카오맵 객체 생성 성공!");

        // 4. 내 위치 가져오기
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setMyLocation({ lat, lon });
            console.log("📍 [INFO] 내 위치 확보:", lat, lon);
            
            const locPosition = new window.kakao.maps.LatLng(lat, lon);
            kakaoMap.setCenter(locPosition);
            
            const marker = new window.kakao.maps.Marker({ position: locPosition });
            marker.setMap(kakaoMap);

            const iwContent = '<div style="padding:5px; color:black;">📍 내 위치</div>';
            const infowindow = new window.kakao.maps.InfoWindow({ content: iwContent });
            infowindow.open(kakaoMap, marker);
          }, (err) => {
            console.error("❌ [ERROR] 위치 권한 거부됨:", err);
          });
        }
      } catch (err) {
        console.error("❌ [ERROR] 지도 생성 중 오류 발생:", err);
      }
    };

    // 2. 스크립트 로드 확인
    if (window.kakao && window.kakao.maps) {
      console.log("✅ [INFO] 카카오 스크립트가 이미 로드되어 있음");
      initMap();
    } else {
      console.log("🔄 [INFO] 카카오 스크립트 로딩 시작...");
      const scriptId = "kakao-map-script";
      
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_JS_KEY;
        
        console.log("🔑 [CHECK] API Key:", apiKey ? "존재함 (보안상 값은 숨김)" : "❌ 없음 (undefined)");

        
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
        script.id = scriptId;
        script.async = true;
        
        script.onload = () => {
          console.log("✅ [INFO] 스크립트 로드 완료 (onload)");
          window.kakao.maps.load(() => {
            console.log("✅ [INFO] 카카오맵 모듈 초기화 완료 (maps.load)");
            initMap();
          });
        };
        
        script.onerror = () => {
            console.error("❌ [ERROR] 스크립트 로드 실패! (API 키나 도메인 제한 확인)");
        };

        document.head.appendChild(script);
      }
    }
  }, []);

  // --- [2. 마커 업데이트] ---
  useEffect(() => {
    if (!map || restaurants.length === 0) return;
    console.log(`📍 [INFO] 마커 ${restaurants.length}개 찍기 시작`);

    // 기존 마커 삭제
    markers.forEach(m => m.setMap(null));
    const newMarkers: any[] = [];
    const bounds = new window.kakao.maps.LatLngBounds();

    if (myLocation) {
        bounds.extend(new window.kakao.maps.LatLng(myLocation.lat, myLocation.lon));
    }

    restaurants.forEach((res) => {
      const position = new window.kakao.maps.LatLng(parseFloat(res.y), parseFloat(res.x));
      
      const marker = new window.kakao.maps.Marker({
        position: position,
        title: res.place_name,
      });
      
      marker.setMap(map);
      newMarkers.push(marker);
      bounds.extend(position);

      window.kakao.maps.event.addListener(marker, 'click', function() {
        const content = `
          <div style="padding:10px;font-size:12px;color:black;">
            <strong>${res.place_name}</strong><br/>
            <a href="${res.place_url}" target="_blank" style="color:blue;">상세보기</a>
          </div>`;
        const infowindow = new window.kakao.maps.InfoWindow({ content: content, removable: true });
        infowindow.open(map, marker);
      });
    });

    setMarkers(newMarkers);
    map.setBounds(bounds);
  }, [restaurants, map]);

  // --- [핸들러 함수들] ---
  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);

    const getCurrentLocation = () => {
      return new Promise<{lat: number, lon: number}>((resolve, reject) => {
        if (myLocation) {
          resolve(myLocation);
        } else {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setMyLocation({ lat: latitude, lon: longitude });
              resolve({ lat: latitude, lon: longitude });
            },
            (err) => reject(err)
          );
        }
      });
    };

    try {
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("lat", location.lat.toString());
      formData.append("lon", location.lon.toString());

      const response = await axios.post("http://127.0.0.1:8000/api/recommend", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ 결과:", response.data);
      setKeywords(response.data.analysis_keywords);
      setRestaurants(response.data.recommendations);
    } catch (error) {
      console.error("❌ 에러:", error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setRestaurants([]);
    }
  };

  return (
    <div className="main-layout">
      {/* 1. 사이드바 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="title">🍕 DishCover</h1>
          <p className="sub-title">사진으로 찾는 내 주변 맛집</p>

          <label className="upload-box">
            {preview ? (
              <img src={preview} alt="미리보기" className="preview-image" />
            ) : (
              <>
                <FaCamera size={30} color="#ced4da" style={{marginBottom: 10}}/>
                <span style={{color: "#adb5bd"}}>음식 사진 업로드</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
          </label>

          <button className="analyze-btn" onClick={handleAnalyze} disabled={loading || !selectedFile}>
            {loading ? "AI 분석 중... 🍳" : "맛집 찾기 🚀"}
          </button>
        </div>

        <div className="scrollable-content">
          <div className="keyword-section">
            {keywords.map((k, i) => <span key={i} className="keyword-badge">#{k}</span>)}
          </div>

          <div className="list-section">
            {restaurants.length === 0 && !loading && (
              <p style={{color: "#868e96", textAlign: "center", marginTop: 20}}>
                사진을 올리고 맛집을 찾아보세요!
              </p>
            )}
            {restaurants.map((res, i) => (
              <div key={i} className="list-item" onClick={() => window.open(res.place_url)}>
                <h4 className="item-name">{res.place_name}</h4>
                <p className="item-desc"><FaMapMarkerAlt size={12}/> {res.road_address_name}</p>
                <p className="item-desc" style={{marginTop: 5, color: "#339af0"}}>
                  <FaExternalLinkAlt size={10}/> 상세정보 보기
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. 지도 영역 */}
      <div className="map-area">
        <div id="kakao-map"></div>
      </div>
    </div>
  );
}

export default App;