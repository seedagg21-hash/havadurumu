const DAYS_TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const CONDITION_MAP = [
  { codes: [1000], emoji: "☀️", theme: "gunesli", cat: "cat-sunglasses.gif" },
  { codes: [1003], emoji: "🌤️", theme: "bulutlu", cat: "cat-normal.gif" },
  { codes: [1006,1009], emoji: "☁️", theme: "bulutlu", cat: "cat-normal.gif" },
  { codes: [1180,1183,1186,1189,1240], emoji: "🌧️", theme: "yagmurlu", cat: "cat-umbrella.gif" },
  { codes: [1192,1195,1243,1246], emoji: "🌧️", theme: "yagmurlu", cat: "cat-umbrella.gif" },
  { codes: [1273,1276,1279,1282], emoji: "⛈️", theme: "yagmurlu", cat: "cat-umbrella.gif" },
  { codes: [1066,1069,1072,1114,1117,1210,1213,1216,1219,1222,1225,1255,1258], emoji: "❄️", theme: "karli", cat: "cat-winter.gif" },
  // Fallsbacks / Çiseleme vs
  { codes: [1150,1153,1168,1171,1087], emoji: "🌧️", theme: "yagmurlu", cat: "cat-umbrella.gif" }
];

let globalWeatherData = null;
let isNightOverrideActive = true;
let currentViewData = null;
let currentViewTimeStr = null;

function getThemeAndCat(code, hourStr) {
  // hourStr opsiyoneldir (zaman stringi). Verilmezse anlık saati kullanır.
  let hour = new Date().getHours();
  if (hourStr) {
    hour = new Date(hourStr).getHours();
  }

  // GECE KURALI (00:00 ile 06:00 arası): Hava ne olursa olsun uyuyan kedi + mor arka plan (#caa5ec)
  if (hour >= 0 && hour < 6 && isNightOverrideActive) {
    return { theme: "gece", cat: "cat-sleep.gif", emoji: "🌙" };
  }

  // Diğer saatlerde hava durumu kuralına göre bak
  for (const m of CONDITION_MAP) {
    if (m.codes.includes(code)) return m;
  }
  
  // Bulunamazsa varsayılan
  return { emoji: "☁️", theme: "bulutlu", cat: "cat-normal.gif" };
}

function applyThemeAndCat(theme, cat) {
  document.body.className = `theme-${theme}`;
  
  const catImg = document.getElementById("cat-gif");
  // Küçük bir solma efektiyle kediyi değiştir
  catImg.style.opacity = 0;
  setTimeout(() => {
    catImg.src = `/static/${cat}`;
    catImg.style.opacity = 1;
  }, 200);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}, ${DAYS_TR[d.getDay()]}`;
}

async function fetchWeather(queryStr) {
  try {
    const res = await fetch(`/weather?${queryStr}`);
    if (!res.ok) throw new Error("Ağ hatası");
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    globalWeatherData = data;
    updateUI(data);
  } catch (err) {
    alert("Hava durumu yüklenirken bir sorun oluştu: " + err.message);
  }
}

function updateUI(data) {
  // Ana kartı doldur
  renderCurrent(data.current, data.location, new Date().toISOString());
  
  // Saatlik verileri doldur
  renderHourly(data);
  
  // Günlük verileri doldur
  renderDaily(data);
}

function getCatAdvice(temp, condInfo, wind) {
  let advice = "";

  // 1. Sıcaklık Yorumu
  if (temp < 0) {
    advice += "Hava adeta buz kesiyor! En kalın kabanını, atkını ve bereni mutlaka al. ";
  } else if (temp >= 0 && temp < 10) {
    advice += "Dışarısı çok soğuk. Çıkarken kalın bir mont giymeyi unutma. ";
  } else if (temp >= 10 && temp < 18) {
    advice += "Serin bir bahar havası var. Yanına orta kalınlıkta bir ceket veya hırka almak iyi bir fikir. ";
  } else if (temp >= 18 && temp < 25) {
    advice += "Hava ılık ve harika! Tişört ya da ince bir şeyler giyebilirsin. ";
  } else {
    advice += "Hava çok sıcak! Serin tutan, ince ve açık renkli kıyafetler tercih et. ";
  }

  // 2. Hava Durumu Koşulu (Tema üzerinden)
  if (condInfo.theme === "yagmurlu") {
    advice += "Ayrıca yağmur ihtimali var, şemsiyeni ve yağmurluğunu kesinlikle yanına al! ☔ ";
  } else if (condInfo.theme === "karli") {
    advice += "Kar veya buzlanma olabilir! Yerler kayganlaşabilir, kışlık botlarını giymelisin. ❄️ ";
  } else if (condInfo.theme === "gunesli") {
    if (temp >= 20) {
      advice += "Güneş gözlüğünü ve güneş kremini sürmeyi unutma! 🕶️☀️ ";
    } else {
      advice += "Güneşli parlak bir hava var, gözlüğünü takabilirsin. 🕶️ ";
    }
  } else if (condInfo.theme === "gece") {
    advice += "Gece saatleri, hava iyice soğuyabilir. Pijamanla evde kalmak veya kalın giyinmek iyi fikir. 🌙 ";
  }

  // 3. Rüzgar Durumu
  if (wind > 20 && wind <= 40) {
    advice += "Biraz rüzgarlı bir hava var, esinti çarpabilir. 🌬️ ";
  } else if (wind > 40) {
    advice += "Dışarıda fırtına gibi sert bir rüzgar var! Rüzgarlık giymen şart. 🌪️ ";
  }

  return advice;
}

function renderCurrent(cur, loc, timeStr) {
  currentViewData = cur;
  currentViewTimeStr = timeStr;

  document.getElementById("location-name").textContent = `${loc.name}`;
  document.getElementById("current-date").textContent = formatDate(timeStr);
  document.getElementById("current-temp").textContent = Math.round(cur.temp_c);
  
  const condInfo = getThemeAndCat(cur.condition.code, timeStr);
  document.getElementById("current-desc").textContent = `${cur.condition.text} ${condInfo.emoji}`;

  document.getElementById("hum-val").textContent = `%${cur.humidity}`;
  document.getElementById("wind-val").textContent = `${Math.round(cur.wind_kph)} km/s`;
  document.getElementById("pressure-val").textContent = `${cur.pressure_mb} mb`;

  // Tavsiye Kutusunu Güncelle
  const adviceText = getCatAdvice(cur.temp_c, condInfo, cur.wind_kph);
  const adviceEl = document.getElementById("cat-advice-text");
  if (adviceEl) {
    // Eğer gece modu 00:00-06:00 arası devreye girdiyse ve gerçek havaya swipe edilmediyse ek bilgi ekle
    let extraAdvice = "";
    const hour = new Date(timeStr ? timeStr : new Date()).getHours();
    if (hour >= 0 && hour < 6 && isNightOverrideActive) {
      extraAdvice = "<br><em style='font-size:0.85rem; opacity:0.8;'>(💡 Gerçek hava durumunu görmek için bu paneli sağa/sola kaydırın)</em>";
    }
    adviceEl.innerHTML = adviceText + extraAdvice;
  }

  applyThemeAndCat(condInfo.theme, condInfo.cat);
}

function renderHourly(data) {
  const wrap = document.getElementById("hourly-scroll");
  wrap.innerHTML = "";
  
  const now = new Date();
  const today = data.forecast.forecastday[0];
  const tomorrow = data.forecast.forecastday[1];

  // Gelecek 24 saati gösterelim
  const todayHours = today.hour.filter(h => new Date(h.time) >= now || new Date(h.time).getHours() === now.getHours());
  const tomorrowHours = tomorrow ? tomorrow.hour : [];
  const merged = [...todayHours, ...tomorrowHours].slice(0, 24);

  merged.forEach((h, index) => {
    const dt = new Date(h.time);
    const condInfo = getThemeAndCat(h.condition.code, h.time);
    
    const card = document.createElement("div");
    card.className = "hour-card glass-panel";
    if (index === 0) card.classList.add("active");

    card.innerHTML = `
      <div class="hour-time">${String(dt.getHours()).padStart(2, "0")}:00</div>
      <div class="hour-icon">${condInfo.emoji}</div>
      <div class="hour-temp">${Math.round(h.temp_c)}°</div>
    `;

    // Saatlik karta tıklandığında üst kısım (Hero) güncellensin
    card.addEventListener("click", () => {
      document.querySelectorAll(".hour-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      
      // Saatlik veriden alınan hava ve durumu en üstte göster
      renderCurrent(h, data.location, h.time);
    });

    wrap.appendChild(card);
  });
}

function renderDaily(data) {
  const wrap = document.getElementById("daily-list");
  wrap.innerHTML = "";
  
  data.forecast.forecastday.forEach(d => {
    const dt = new Date(d.date);
    const dayName = DAYS_TR[dt.getDay()];
    // Günlük listede gece saatine takılmaması için öğleni (12:00) baz alırız
    const condInfo = getThemeAndCat(d.day.condition.code, d.date + " 12:00");

    const row = document.createElement("div");
    row.className = "day-row glass-panel";
    row.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${condInfo.emoji}</div>
      <div class="day-temps">
        <span class="max">${Math.round(d.day.maxtemp_c)}°</span>
        <span class="min">${Math.round(d.day.mintemp_c)}°</span>
      </div>
    `;

    // Günlük satıra tıklandığında, saatlik kaydırıcıyı o güne set edelim
    row.addEventListener("click", () => {
      const wrapH = document.getElementById("hourly-scroll");
      wrapH.innerHTML = "";
      
      d.hour.forEach((h, index) => {
        const dtH = new Date(h.time);
        const condH = getThemeAndCat(h.condition.code, h.time);
        
        const cardH = document.createElement("div");
        cardH.className = "hour-card glass-panel";
        if (index === 12) cardH.classList.add("active"); // default öğlen seçili
        
        cardH.innerHTML = `
          <div class="hour-time">${String(dtH.getHours()).padStart(2,"0")}:00</div>
          <div class="hour-icon">${condH.emoji}</div>
          <div class="hour-temp">${Math.round(h.temp_c)}°</div>
        `;

        cardH.addEventListener("click", () => {
          document.querySelectorAll(".hour-card").forEach(c => c.classList.remove("active"));
          cardH.classList.add("active");
          renderCurrent(h, data.location, h.time);
        });

        wrapH.appendChild(cardH);
      });

      // Öğlen saatini Hero'da göster
      renderCurrent(d.hour[12], data.location, d.hour[12].time);
      wrapH.scrollLeft = 0;
    });

    wrap.appendChild(row);
  });
}

// Türkçe Karakterleri İngilizceye Çevirme (API için)
function normalizeTurkish(str) {
  const map = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'I',
    'İ': 'I', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };
  return str.replace(/[çÇğĞıIİiöÖşŞüÜ]/g, match => map[match]);
}

// Arama ve Konum
document.getElementById("search-btn").addEventListener("click", () => {
  const q = document.getElementById("search-input").value.trim();
  if (q) {
    document.getElementById("location-name").textContent = "Aranıyor...";
    const normalizedQ = normalizeTurkish(q);
    fetchWeather(`q=${encodeURIComponent(normalizedQ)}`);
  }
});

document.getElementById("search-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("search-btn").click();
  }
});

document.getElementById("location-btn").addEventListener("click", () => {
  if (navigator.geolocation) {
    document.getElementById("location-name").textContent = "Konum bulunuyor...";
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      err => {
        alert("Konum izni alınamadı. Arama kutusunu kullanın.");
      }
    );
  } else {
    alert("Tarayıcınız konum özelliğini desteklemiyor.");
  }
});

// Başlangıç Yüklemesi
window.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => {
        fetchWeather(`q=Istanbul`); // Fallback
      }
    );
  } else {
    fetchWeather(`q=Istanbul`);
  }

  // Her 30 dakikada bir veriyi güncelle
  setInterval(() => {
    if (globalWeatherData) {
      const q = globalWeatherData.location.name;
      const normalizedQ = normalizeTurkish(q);
      fetchWeather(`q=${encodeURIComponent(normalizedQ)}`);
    }
  }, 30 * 60 * 1000);
});

// Kaydırma (Swipe) Olayları - Sadece Ana Kutu İçin
let touchstartX = 0;
let touchendX = 0;

const heroSection = document.querySelector('.hero-section');

heroSection.addEventListener('touchstart', e => {
  touchstartX = e.changedTouches[0].screenX;
});

heroSection.addEventListener('touchend', e => {
  touchendX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  if (Math.abs(touchendX - touchstartX) > 40) { // 40 pikselden fazla kaydırıldıysa
    if (currentViewTimeStr && globalWeatherData && currentViewData) {
      const h = new Date(currentViewTimeStr).getHours();
      // Yalnızca gece saatindeysek değişime izin verelim
      if (h >= 0 && h < 6) {
        isNightOverrideActive = !isNightOverrideActive; // Değerin tersini al
        renderCurrent(currentViewData, globalWeatherData.location, currentViewTimeStr);
      }
    }
  }
}

