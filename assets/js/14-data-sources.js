/* 자료 출처. 각 항목에 무엇을 가져왔는지와, 이 시안에서 어떻게 가공했는지를 적습니다. */
window.GC = window.GC || {};

GC.sources = [
  {
    id: 'kigam', tag: '지질',
    org: '한국지질자원연구원 (KIGAM)',
    name: '지질정보시스템',
    url: 'https://mgeo.kigam.re.kr',
    used: ['지질구 구분과 암석 분포', '지질 연대', '지질 용어'],
    how: '1:25만급 지질도를 15개 폴리곤으로 크게 단순화해 다시 그렸습니다. ' +
         '이 사이트의 지질 경계는 개략이며, 정밀한 정보는 원본 지질도를 확인해야 합니다.'
  },
  {
    id: 'kostat', tag: '지도',
    org: '통계청',
    name: '2013 시·도 / 시·군·구 행정경계',
    url: 'https://github.com/southkorea/southkorea-maps',
    used: ['바탕지도의 해안선과 행정경계', '시·군·구 251곳의 중심 좌표'],
    how: 'southkorea-maps(@e9t)가 가공해 공개한 통계청 경계 자료를 내려받아 ' +
         'Douglas–Peucker로 단순화했습니다. 울릉·독도는 삽도로, 신안 먼바다 섬은 축척을 위해 생략했습니다.'
  },
  {
    id: 'geopark', tag: '지질공원',
    org: '환경부 국가지질공원사무국',
    name: '국가지질공원 누리집',
    url: 'https://www.koreageoparks.kr',
    used: ['지질공원과 지질명소 목록', '인증 구분과 연도', '명소 설명의 기초'],
    how: '전체 중 열두 곳만 골라 담았습니다. 인증 연도는 확실한 네 곳만 표기했고, ' +
         '전체 목록과 최신 인증 현황은 누리집에서 확인해야 합니다.'
  },
  {
    id: 'unesco', tag: '지질공원',
    org: 'UNESCO',
    name: 'UNESCO Global Geoparks',
    url: 'https://www.unesco.org/en/iggp',
    used: ['세계지질공원 등재 현황'],
    how: '등재 목록은 갱신되므로, 표기한 구분은 시안 작성 시점 기준입니다.'
  },
  {
    id: 'kma', tag: '지진',
    org: '기상청',
    name: '지진화산 정보 · 국내지진 목록',
    url: 'https://www.weather.go.kr/w/eqk-vol/search/korea.do',
    used: ['2016 경주지진(M5.8)과 2017 포항지진(M5.4)의 규모·진앙'],
    how: '활성단층 선형(양산·울산 단층대)은 개략적으로 그린 것이며 정밀 단층 자료가 아닙니다.'
  },
  {
    id: 'knps', tag: '탐방',
    org: '국립공원공단',
    name: '국립공원 탐방 정보',
    url: 'https://www.knps.or.kr',
    used: ['트레일의 거리·소요 시간·난이도', '탐방로 통제와 예약 안내'],
    how: '고도 프로파일은 공개 정보를 바탕으로 한 개략값이고 실측 자료가 아닙니다. ' +
         '실제 산행 계획에는 반드시 공단의 최신 정보를 확인하세요.'
  },
  {
    id: 'forest', tag: '산',
    org: '산림청',
    name: '100대 명산',
    url: 'https://www.forest.go.kr',
    used: ['산 160곳의 선정 기준'],
    how: '100대 명산에 지역별 대표 산을 더해 추렸습니다. 정상부 좌표는 개략값이며, ' +
         '각 산의 지질구와 암석은 그 좌표를 지질구 경계에 넣어 자동으로 붙인 것입니다.'
  },
  {
    id: 'ics', tag: '시대',
    org: 'International Commission on Stratigraphy',
    name: 'International Chronostratigraphic Chart',
    url: 'https://stratigraphy.org/chart',
    used: ['지질시대 구분', '시대별 색 체계의 기준'],
    how: '국제 표준 시대색을 바탕으로 하되, 색약 구분과 화면 대비 기준을 통과하도록 ' +
         '채도와 명도를 다시 조정했습니다.'
  }
];

GC.sourceNote =
  '이 사이트는 위 자료를 바탕으로 재구성한 개인 시안입니다. 어떤 기관의 공식 자료도 아니며, ' +
  '학술·실무 목적이라면 반드시 원본을 확인하세요. 공개 데이터의 이용 조건(공공누리 유형)은 ' +
  '정식 공개 전에 각 기관에 확인이 필요합니다.';

/* 페이지별로 어떤 출처를 쓰는지 */
GC.pageSources = {
  map: ['kigam', 'kostat', 'kma', 'ics'],
  mountains: ['forest', 'kigam', 'kostat'],
  geoparks: ['geopark', 'unesco', 'kigam'],
  trails: ['knps', 'kigam', 'geopark'],
  footprint: ['kigam', 'kostat'],
  rock: ['kigam'],
  stories: ['kigam', 'ics']
};
