import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css"; 
import { FaCamera, FaMapMarkerAlt, FaExternalLinkAlt, FaSearch } from "react-icons/fa";

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
  
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]); // 맛집 마커들
  
  // [NEW] 기준점(빨간 핀) 마커를 관리하기 위한 Ref
  // useState가 아니라 useRef를 쓰는 이유: 지도 위에 그려진 객체를 직접 제어하기 위함
  const centerMarkerRef = useRef<any>(null);
  const centerOverlayRef = useRef<any>(null);
  const activeOverlayRef = useRef<any>(null);

  // 검색 관련 상태
  const [locationQuery, setLocationQuery] = useState("");
  const [targetLocation, setTargetLocation] = useState<{lat: number, lon: number} | null>(null);
  
  // 자동완성 목록 상태
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- [1. 기준점 마커 표시 함수 (핵심 수정)] ---
  const displayCenterMarker = (mapInstance: any, position: any, label: string) => {
    // 1. 기존 마커 지우기
    if (centerMarkerRef.current) {
        centerMarkerRef.current.setMap(null);
    }
    
    // 2. 기존 오버레이(구 인포윈도우) 지우기
    if (centerOverlayRef.current) {
        centerOverlayRef.current.setMap(null);
    }

    // 3. 마커 이미지 설정 (기존과 동일)
    const imageSrc = "http://maps.google.com/mapfiles/ms/icons/red-dot.png"; 
    const imageSize = new window.kakao.maps.Size(32, 32); 
    const imageOption = {offset: new window.kakao.maps.Point(16, 32)};
    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 4. 새 마커 생성
    const marker = new window.kakao.maps.Marker({
        position: position,
        image: markerImage 
    });
    marker.setMap(mapInstance);
    
    // 5. [수정됨] CustomOverlay 생성
    // InfoWindow 대신 CustomOverlay를 사용하면 불필요한 여백과 테두리가 사라집니다.
    const content = `
      <div class="custom-iw center">
        📍 ${label}
      </div>
    `;

    const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 2.4,
        xAnchor: 0.5, // 1이면 마커 위치, 숫자가 클수록 위로 올라갑니다. (마커 높이 고려)
        zIndex: 100
    });
    
    // 오버레이는 open() 대신 setMap(map)으로 표시합니다.
    customOverlay.setMap(mapInstance);

    // 6. Ref에 저장
    centerMarkerRef.current = marker;
    centerOverlayRef.current = customOverlay; // InfoWindow 대신 Overlay 저장
};

  // --- [2. 지도 초기화] ---
  useEffect(() => {
    const initMap = () => {
      const container = document.getElementById('kakao-map');
      if (!container) return;

      const options = {
        center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
        level: 4
      };
      const kakaoMap = new window.kakao.maps.Map(container, options);
      setMap(kakaoMap);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setTargetLocation({ lat, lon });
          
          const locPosition = new window.kakao.maps.LatLng(lat, lon);
          kakaoMap.setCenter(locPosition);
          
          // 초기 로딩 시에는 "현재위치"로 표시
          displayCenterMarker(kakaoMap, locPosition, "현재 위치");
        });
      }
    };

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      const scriptId = "kakao-map-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_JS_KEY;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
        script.id = scriptId;
        script.async = true;
        script.onload = () => {
          window.kakao.maps.load(() => initMap());
        };
        document.head.appendChild(script);
      }
    }
  }, []);

  // --- [3. 실시간 검색어 자동완성] ---
  useEffect(() => {
    if (!locationQuery.trim()) {
        setSuggestions([]);
        setIsDropdownOpen(false);
        return;
    }

    const delayDebounce = setTimeout(() => {
        if (!window.kakao || !window.kakao.maps) return;
        
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(locationQuery, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                setSuggestions(data);
                setIsDropdownOpen(true);
            } else {
                setSuggestions([]);
            }
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [locationQuery]);

  // --- [4. 맛집 마커 업데이트] ---
  useEffect(() => {
    if (!map || restaurants.length === 0) return;
    markers.forEach(m => m.setMap(null));
    const newMarkers: any[] = [];
    const bounds = new window.kakao.maps.LatLngBounds();

    if (targetLocation) {
        bounds.extend(new window.kakao.maps.LatLng(targetLocation.lat, targetLocation.lon));
    }

    restaurants.forEach((res) => {
      const position = new window.kakao.maps.LatLng(parseFloat(res.y), parseFloat(res.x));
      const marker = new window.kakao.maps.Marker({ position: position, title: res.place_name });
      marker.setMap(map);
      newMarkers.push(marker);
      bounds.extend(position);

      // ▼▼▼ [수정됨] CustomOverlay로 변경하여 테두리 제거 및 닫기 기능 구현 ▼▼▼
      window.kakao.maps.event.addListener(marker, 'click', function() {
        // 1. 이미 열려있는 오버레이가 있다면 닫기
        if (activeOverlayRef.current) {
            activeOverlayRef.current.setMap(null);
        }

        const category = res.category_name ? res.category_name.split(">").pop()?.trim() : "음식점";

        // 2. HTML 컨텐츠를 문자열이 아닌 DOM Element로 생성 (이벤트 연결을 위해)
        const content = document.createElement('div');
        content.innerHTML = `
          <div class="custom-iw restaurant">
            <div class="iw-header">
                <span class="iw-category">${category}</span>
                <button class="close-btn" title="닫기">✕</button>
            </div>
            <div class="iw-title">${res.place_name}</div>
            <a href="${res.place_url}" target="_blank" class="iw-link">상세보기 ></a>
          </div>
        `;

        // 3. CustomOverlay 생성
        const overlay = new window.kakao.maps.CustomOverlay({
            position: position,
            content: content,
            yAnchor: 1.3, // 마커 머리 위쪽에 위치하도록 조정
            zIndex: 100
        });

        // 4. 닫기 버튼 클릭 시 오버레이 제거 이벤트 연결
        const closeBtn = content.querySelector('.close-btn');
        if (closeBtn) {
            // @ts-ignore (타입스크립트 에러 방지용, 필요시 HTMLElement 타입 단언)
            closeBtn.onclick = () => {
                overlay.setMap(null);
                activeOverlayRef.current = null;
            };
        }

        // 5. 지도에 표시 및 현재 오버레이로 등록
        overlay.setMap(map);
        activeOverlayRef.current = overlay;
      });
      // ▲▲▲ [수정 끝] ▲▲▲

    });
    setMarkers(newMarkers);
    map.setBounds(bounds);
  }, [restaurants, map]);

  // --- [5. 핸들러: 장소 선택] ---
  const handleSuggestionClick = (place: any) => {
    const lat = parseFloat(place.y);
    const lon = parseFloat(place.x);

    setTargetLocation({ lat, lon });
    setLocationQuery(place.place_name);
    setSuggestions([]);
    setIsDropdownOpen(false);

    if (map) {
        const moveLatLon = new window.kakao.maps.LatLng(lat, lon);
        map.setCenter(moveLatLon);
        map.setLevel(4);
        
        // 검색으로 이동했으므로 "설정된 위치"로 표시
        displayCenterMarker(map, moveLatLon, "설정된 위치");
    }
  };

  const handleLocationSearch = () => {
    if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLocationSearch();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    if (!targetLocation) {
        alert("지도에서 위치를 먼저 잡아주세요!");
        return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("lat", targetLocation.lat.toString());
      formData.append("lon", targetLocation.lon.toString());

      const response = await axios.post("http://127.0.0.1:8000/api/recommend", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
            {loading ? "AI 분석 중... 🍳" : "이 지역 맛집 찾기 🚀"}
          </button>
        </div>

        <div className="scrollable-content">
          <div className="keyword-section">
            {keywords.map((k, i) => <span key={i} className="keyword-badge">#{k}</span>)}
          </div>
          <div className="list-section">
            {restaurants.length === 0 && !loading && (
              <p style={{color: "#868e96", textAlign: "center", marginTop: 20}}>
                사진을 올리고 위치를 설정한 뒤<br/>맛집을 찾아보세요!
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

      <div className="map-area">
        <div className="map-search-container">
            <div className="search-input-wrapper">
                <FaSearch />
                <input 
                    className="map-search-input" 
                    placeholder="장소 검색 (예: 강남, 부산)"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="map-search-btn" onClick={handleLocationSearch}>이동</button>
            </div>

            {isDropdownOpen && suggestions.length > 0 && (
                <div className="suggestion-box">
                    {suggestions.map((place, index) => (
                        <div 
                            key={index} 
                            className="suggestion-item"
                            onClick={() => handleSuggestionClick(place)}
                        >
                            <span className="place-name">{place.place_name}</span>
                            <span className="place-address">{place.road_address_name || place.address_name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div id="kakao-map"></div>
      </div>
    </div>
  );
}

export default App;