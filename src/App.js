import { useEffect, useRef, useState } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

export default function App() {
  const [location, setLocation] = useState(function () {
    const place = localStorage.getItem("location");
    return place ? place : "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState({});
  const [displyWeather, setDisplayWeather] = useState("");

  useEffect(
    function () {
      const controller = new AbortController();
      async function fetchWeather() {
        try {
          if (location.length < 2) return;
          setIsLoading(true);
          // 1) Getting location (geocoding)
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}`,
            { signal: controller.signal }
          );
          const geoData = await geoRes.json();

          if (!geoData.results) throw new Error("Location not found");

          const { latitude, longitude, timezone, name, country_code } =
            geoData.results.at(0);
          setDisplayWeather(`${name} ${convertToFlag(country_code)}`);

          // 2) Getting actual weather
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );
          const weatherData = await weatherRes.json();
          setWeather(weatherData.daily);

          // setIsLoading(false);
        } catch (err) {
          if (err.name === "AbortError") return;
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
      fetchWeather();
      return function () {
        controller.abort();
      };
    },
    [location]
  );

  return (
    <div className="app">
      <h1>Classy weather app</h1>
      <SearchBar location={location} setLocation={setLocation} />

      {isLoading && <p className="loading">Loading...</p>}
      {weather.weathercode && (
        <Weather displyWeather={displyWeather} weather={weather} />
      )}
    </div>
  );
}

function SearchBar({ location, setLocation }) {
  const inputEl = useRef(null);

  useEffect(() => {
    localStorage.setItem("location", location);
    inputEl.current.focus();
    const callback = function (e) {
      if (e.key === "Enter") setLocation("");
    };
    document.addEventListener("keydown", callback);

    return function () {
      document.removeEventListener("keydown", callback);
    };
  }, [location]);
  return (
    <input
      type="text"
      value={location}
      onChange={(e) => setLocation(e.target.value)}
      ref={inputEl}
    />
  );
}

function Weather({ displyWeather, weather }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;
  return (
    <div>
      <h2>{displyWeather}</h2>
      <ul className="weather">
        {dates.map((date, i) => (
          <Day
            date={date}
            max={max.at(i)}
            min={min.at(i)}
            code={codes.at(i)}
            key={date}
            isToday={i === 0}
          />
        ))}
      </ul>
    </div>
  );
}

function Day({ date, max, min, code, isToday }) {
  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}</strong>
      </p>
    </li>
  );
}
