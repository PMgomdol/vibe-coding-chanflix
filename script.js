(function () {
  const API_BASE = 'https://api.themoviedb.org/3';
  const IMAGE_BASE = 'https://image.tmdb.org/t/p';
  const IMAGE_W500 = `${IMAGE_BASE}/w500`;
  const NOW_PLAYING_URL = `${API_BASE}/movie/now_playing?language=ko-KR`;
  const API_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2ODM0MDViMTY0ZDhmMGYwZjcyNGRiMDk5YjFhZThjMyIsIm5iZiI6MTc3MjAyNjkxMy4yNTEwMDAyLCJzdWIiOiI2OTllZmMyMTRiMjNmNDc0MDNlOTM4YmIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.E6F4cV0Gvzup5TC3DlXJAhM1Ll312PJpwfyW35x_2jw';

  const authHeader = {
    Authorization: `Bearer ${API_ACCESS_TOKEN}`,
    accept: 'application/json',
  };

  const intro = document.getElementById('intro');
  const hero = document.getElementById('hero');
  const heroBackdrop = document.getElementById('heroBackdrop');
  const heroVideoWrap = document.getElementById('heroVideoWrap');
  const heroTrailer = document.getElementById('heroTrailer');
  const heroBadge = document.getElementById('heroBadge');
  const heroTitle = document.getElementById('heroTitle');
  const heroOverview = document.getElementById('heroOverview');
  const moviesGrid = document.getElementById('movies-grid');
  const loadingEl = document.getElementById('loading');
  const modal = document.getElementById('modal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalPoster = document.getElementById('modalPoster');
  const modalTitle = document.getElementById('modalTitle');
  const modalOverview = document.getElementById('modalOverview');
  const modalMeta = document.getElementById('modalMeta');

  function getPosterUrl(path) {
    if (!path) return '';
    return path.startsWith('http') ? path : `${IMAGE_W500}${path}`;
  }

  function getBackdropUrl(path) {
    if (!path) return '';
    return path.startsWith('http') ? path : `${IMAGE_BASE}/w1280${path}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== 인트로: 영화 시작 연출 후 메인 노출 =====
  function startIntro() {
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      intro.classList.add('is-hidden');
      document.body.style.overflow = '';
    }, 4800);
  }

  // ===== 예고편 YouTube 키 가져오기 =====
  async function fetchTrailerKey(movieId) {
    const url = `${API_BASE}/movie/${movieId}/videos?language=ko-KR`;
    const res = await fetch(url, { headers: authHeader });
    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.results || [];
    const trailer = videos.find(function (v) {
      return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser');
    });
    return trailer ? trailer.key : null;
  }

  // ===== 히어로 설정 (메인 픽처 + 예고편) =====
  function setHero(movie, trailerKey) {
    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    heroBackdrop.style.backgroundImage = backdropUrl ? `url(${backdropUrl})` : 'none';
    heroTitle.textContent = movie.title;
    heroOverview.textContent = movie.overview || '';

    // file:// 로 열면 YouTube가 Referer 없음으로 차단(오류 153) → 배경 이미지만 표시
    const isLocalFile = window.location.protocol === 'file:';
    if (trailerKey && !isLocalFile) {
      heroTrailer.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${trailerKey}`;
      heroVideoWrap.classList.add('is-visible');
    } else {
      heroVideoWrap.classList.remove('is-visible');
    }
  }

  function renderMovieCard(movie) {
    const posterUrl = getPosterUrl(movie.poster_path);
    const title = escapeHtml(movie.title);
    const overview = escapeHtml(movie.overview || '줄거리 없음');

    const card = document.createElement('article');
    card.className = 'movie-card';
    card.setAttribute('data-id', movie.id);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#2a2a2a,#1a1a1a)';this.alt='포스터 없음';">
      </div>
      <div class="card-info">
        <h3 class="card-title">${title}</h3>
        <p class="card-overview">${overview}</p>
      </div>
    `;

    card.addEventListener('click', function () {
      openModal(movie);
    });

    return card;
  }

  function openModal(movie) {
    modalPoster.src = getPosterUrl(movie.poster_path);
    modalPoster.alt = movie.title;
    modalTitle.textContent = movie.title;
    modalOverview.textContent = movie.overview || '줄거리 정보가 없습니다.';
    const parts = [];
    if (movie.release_date) parts.push(movie.release_date.slice(0, 4));
    if (movie.vote_average != null) parts.push(`평점 ${movie.vote_average.toFixed(1)}`);
    modalMeta.textContent = parts.join(' · ');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  modalBackdrop.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  async function fetchNowPlaying() {
    try {
      const res = await fetch(NOW_PLAYING_URL, { headers: authHeader });
      if (!res.ok) throw new Error('API 요청 실패: ' + res.status);
      const data = await res.json();
      const movies = data.results || [];

      loadingEl.classList.add('hidden');

      if (movies.length === 0) {
        moviesGrid.innerHTML = '<p class="loading">현재 상영 중인 영화가 없습니다.</p>';
        heroTitle.textContent = '상영 중인 영화가 없습니다';
        return;
      }

      // 첫 번째 영화를 메인 픽처로, 예고편 있으면 재생
      const featured = movies[0];
      const trailerKey = await fetchTrailerKey(featured.id);
      setHero(featured, trailerKey);

      // 그리드에는 전체 목록 표시
      movies.forEach(function (movie) {
        moviesGrid.appendChild(renderMovieCard(movie));
      });
    } catch (err) {
      loadingEl.classList.add('hidden');
      moviesGrid.innerHTML = '<p class="loading">영화 목록을 불러오지 못했습니다. (' + escapeHtml(err.message) + ')</p>';
      heroTitle.textContent = '로딩 실패';
    }
  }

  startIntro();
  fetchNowPlaying();
})();
